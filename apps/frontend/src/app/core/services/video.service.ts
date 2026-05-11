import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PlaybackSource } from '../../video/core/playback-source';
export type { PlaybackSource } from '../../video/core/playback-source';

export type StorageProvider = string;

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
  project: any;
  comments: any[];
  createdAt: string;
  updatedAt: string;
  hlsPath?: string;
  storageProvider?: StorageProvider;
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

  uploadVideo(formData: FormData, file?: File): Observable<UploadResponse> {
    return this.getProviderStatus().pipe(
      switchMap((status) => {
        if ((status.activeProvider ?? status.provider) === 'local') {
          return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData);
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, this.createRemoteUploadPayload(formData, file));
      }),
      switchMap((response) => {
        if (!this.isRemoteUploadResponse(response)) {
          return of(response);
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        return this.http.put(response.uploadUrl, file, {
          headers: new HttpHeaders(response.uploadHeaders),
          responseType: 'text',
        }).pipe(
          map(() => response),
          catchError((error) => {
            return this.deleteVideo(response.video.id).pipe(
              switchMap(() => throwError(() => error)),
              catchError(() => throwError(() => error))
            );
          })
        );
      })
    );
  }

  updateVideo(id: string, payload: FormData, file?: File): Observable<Video | UploadResponse> {
    return this.http.patch<Video | UploadResponse>(`${this.apiUrl}/${id}`, payload).pipe(
      switchMap((response) => {
        if (!this.isRemoteUploadResponse(response)) {
          return of(response);
        }

        if (!file) {
          throw new Error('Remote upload requires a file');
        }

        return this.http.put(response.uploadUrl, file, {
          headers: new HttpHeaders(response.uploadHeaders),
          responseType: 'text',
        }).pipe(
          map(() => response)
        );
      })
    );
  }

  deleteVideo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
}
