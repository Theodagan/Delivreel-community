import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, switchMap, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PlaybackSource } from '../../video/core/playback-source';
export type { PlaybackSource } from '../../video/core/playback-source';

export type StorageProvider = string;

export interface VideoProjectSummary {
  id: string;
  title: string;
  ownerId: string;
  approverIds?: string[];
}

export interface VideoCapabilities {
  canView?: boolean;
  canComment?: boolean;
  canResolveComments?: boolean;
  canUploadVideos?: boolean;
  canDownloadVideos?: boolean;
  canApproveVideos?: boolean;
  canSignOffVideos?: boolean;
  canInviteMembers?: boolean;
  canManageSettings?: boolean;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  originalFilename: string;
  filename: string;
  size: number;
  status: 'processing' | 'ready' | 'failed';
  duration?: number;
  projectId: string;
  project: VideoProjectSummary;
  comments: any[];
  createdAt: string;
  updatedAt: string;
  hlsPath?: string;
  storageProvider?: StorageProvider;
  approvedAt?: string | null;
  approvedBy?: string | null;
  signedOffAt?: string | null;
  signedOffBy?: string | null;
  archivedAt?: string | null;
  downloadEnabled?: boolean;
  downloadAllowed?: boolean;
  downloadSupported?: boolean;
  capabilities?: VideoCapabilities;
}

export interface CreateVideoRequest {
  title: string;
  description?: string;
  projectId: string;
}

export type UploadResponse =
  | { provider: string; video: Video }
  | {
      provider: string;
      video: Video;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      providerUploadId: string;
    };

export interface ProviderMetadata {
  activeProvider?: StorageProvider;
  provider?: StorageProvider;
  appEnvironment?: 'dev' | 'prod' | 'selfhost';
  videoProviderMode?: string;
  providerEditable?: boolean;
  providerLockedReason?: string;
  signedTokenTtlSeconds?: number;
  playbackRestrictions?: string | Record<string, unknown>;
  lastWebhookAt?: string;
  timelineMarkerSize?: 'compact' | 'comfortable' | 'large';
  defaultCommentFilter?: 'all' | 'open' | 'resolved';
  autoplayOnLoad?: boolean;
  showProviderBadge?: boolean;
}

export interface VideoStatusResponse {
  id: string;
  status: Video['status'];
  updatedAt: string;
  provider?: StorageProvider;
}

export type UploadProgressCallback = (progress: number) => void;

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private readonly apiUrl = `${environment.apiUrl}/videos`;

  constructor(private http: HttpClient) {}

  getVideos(): Observable<Video[]> {
    return this.http.get<Video[]>(this.apiUrl);
  }

  getVideo(id: string): Observable<Video> {
    return this.http.get<Video>(`${this.apiUrl}/${id}`);
  }

  getVideoStatus(id: string): Observable<VideoStatusResponse> {
    return this.http.get<VideoStatusResponse>(`${this.apiUrl}/${id}/status`);
  }

  uploadVideo(formData: FormData, file?: File, onProgress?: UploadProgressCallback): Observable<UploadResponse> {
    return this.getProviderStatus().pipe(
      switchMap((status) => {
        if ((status.activeProvider ?? status.provider) === 'local') {
          return this.trackHttpUpload(
            this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData, {
              observe: 'events',
              reportProgress: true,
            }),
            onProgress,
          );
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        onProgress?.(5);
        return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, this.createRemoteUploadPayload(formData, file));
      }),
      switchMap((response) => {
        if (!this.isRemoteUploadResponse(response)) {
          return of(response);
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        return this.trackHttpUpload(
          this.http.put(response.uploadUrl, file, {
            headers: new HttpHeaders(response.uploadHeaders),
            responseType: 'text',
            observe: 'events',
            reportProgress: true,
          }),
          (progress) => onProgress?.(Math.max(5, progress)),
        ).pipe(
          map(() => {
            onProgress?.(100);
            return response;
          }),
          catchError((error) => {
            return this.reportUploadFailed(response.video.id).pipe(
              switchMap(() => throwError(() => error)),
              catchError(() => throwError(() => error))
            );
          })
        );
      })
    );
  }

  updateVideo(id: string, payload: FormData, file?: File, onProgress?: UploadProgressCallback): Observable<Video | UploadResponse> {
    return this.trackHttpUpload(
      this.http.patch<Video | UploadResponse>(`${this.apiUrl}/${id}`, payload, {
        observe: 'events',
        reportProgress: true,
      }),
      onProgress,
    ).pipe(
      switchMap((response) => {
        if (!this.isRemoteUploadResponse(response)) {
          return of(response);
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        return this.trackHttpUpload(
          this.http.put(response.uploadUrl, file, {
            headers: new HttpHeaders(response.uploadHeaders),
            responseType: 'text',
            observe: 'events',
            reportProgress: true,
          }),
          (progress) => onProgress?.(Math.max(5, progress)),
        ).pipe(
          map(() => response)
        );
      })
    );
  }

  deleteVideo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateVideoSettings(id: string, payload: { downloadEnabled?: boolean }): Observable<Video> {
    return this.http.patch<Video>(`${this.apiUrl}/${id}/settings`, payload);
  }

  downloadVideo(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  reportUploadFailed(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/upload-failed`, {});
  }

  getPlaybackSource(id: string): Observable<PlaybackSource> {
    return this.http.get<PlaybackSource>(`${this.apiUrl}/${id}/playback`);
  }

  getProviderStatus(): Observable<ProviderMetadata> {
    return this.http.get<ProviderMetadata>(`${this.apiUrl}/provider-status`);
  }

  getEffectiveStatus(video: Video): Video['status'] {
    return video.status;
  }

  getStreamUrl(videoId: string): string {
    return `${environment.apiUrl}/stream/${videoId}/manifest.m3u8`;
  }

  private isRemoteUploadResponse(response: Video | UploadResponse): response is Extract<UploadResponse, { uploadUrl: string }> {
    return !!response && typeof response === 'object' && 'uploadUrl' in response;
  }

  private trackHttpUpload<T>(events$: Observable<HttpEvent<T>>, onProgress?: UploadProgressCallback): Observable<T> {
    return events$.pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      }),
      filter((event): event is HttpResponse<T> => event.type === HttpEventType.Response),
      map((event) => event.body as T),
    );
  }

  private createRemoteUploadPayload(formData: FormData, file: File): Record<string, unknown> {
    return {
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
      projectId: String(formData.get('projectId') ?? ''),
      originalFilename: file.name,
      size: file.size,
      mimeType: file.type || 'video/*',
    };
  }

  approveVideo(id: string): Observable<Video> {
    return this.http.post<Video>(`${this.apiUrl}/${id}/approve`, {});
  }

  revokeApproval(id: string): Observable<Video> {
    return this.http.delete<Video>(`${this.apiUrl}/${id}/approval`);
  }

  signOffVideo(id: string): Observable<Video> {
    return this.http.post<Video>(`${this.apiUrl}/${id}/sign-off`, {});
  }

  revokeSignOff(id: string): Observable<Video> {
    return this.http.delete<Video>(`${this.apiUrl}/${id}/sign-off`);
  }

  archiveVideo(id: string): Observable<Video> {
    return this.http.post<Video>(`${this.apiUrl}/${id}/archive`, {});
  }
}
