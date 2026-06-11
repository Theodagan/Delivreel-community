import { of, firstValueFrom, throwError } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

import { VideoService, Video } from './video.service';

describe('VideoService', () => {
  const makeHttp = () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });

  it('calls upload endpoint', async () => {
    const http = makeHttp();
    const service = new VideoService(http as never);
    const payload = new FormData();
    http.get.mockReturnValue(of({ activeProvider: 'local' }));
    http.post.mockReturnValue(of({ type: HttpEventType.Response, body: { provider: 'local', video: { id: 'v1' } } }));

    await firstValueFrom(service.uploadVideo(payload));

    expect(http.post).toHaveBeenCalledWith('/api/videos/upload', payload, {
      observe: 'events',
      reportProgress: true,
    });
  });

  it('returns effective status from provider-neutral video status', () => {
    const service = new VideoService(makeHttp() as never);
    const video = {
      id: 'v1',
      title: 'Demo',
      originalFilename: 'demo.mp4',
      filename: 'demo.mp4',
      size: 1,
      status: 'processing',
      projectId: 'p1',
      project: { id: 'p1', title: 'P', ownerId: 'o1', approverIds: [] },
      comments: [],
      createdAt: '',
      updatedAt: '',
    } as Video;

    expect(service.getEffectiveStatus(video)).toBe('processing');
  });

  it('returns stream url for a local video', () => {
    const service = new VideoService(makeHttp() as never);

    expect(service.getStreamUrl('video-123')).toBe('/api/stream/video-123/manifest.m3u8');
  });

  it('calls provider status endpoint', async () => {
    const http = makeHttp();
    const service = new VideoService(http as never);
    http.get.mockReturnValue(of({ activeProvider: 'local' }));

    await firstValueFrom(service.getProviderStatus());

    expect(http.get).toHaveBeenCalledWith('/api/videos/provider-status');
  });

  it('calls video status endpoint', async () => {
    const http = makeHttp();
    const service = new VideoService(http as never);
    http.get.mockReturnValue(of({ id: 'video-1', status: 'ready', updatedAt: 'now' }));

    await firstValueFrom(service.getVideoStatus('video-1'));

    expect(http.get).toHaveBeenCalledWith('/api/videos/video-1/status');
  });

  it('reports failed remote uploads and rethrows original error', async () => {
    const http = makeHttp();
    const service = new VideoService(http as never);
    const payload = new FormData();
    const file = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
    const uploadError = new Error('external upload failed');
    payload.append('title', 'Demo');
    payload.append('projectId', 'project-1');
    http.get.mockReturnValue(of({ activeProvider: 'external-test-provider' }));
    http.post
      .mockReturnValueOnce(of({
        provider: 'external-test-provider',
        video: { id: 'video-1' },
        uploadUrl: 'https://uploads.example.test/upload/abc',
        uploadHeaders: {},
        providerUploadId: 'upload-1',
      }))
      .mockReturnValueOnce(of(undefined));
    http.put.mockReturnValue(throwError(() => uploadError));

    await expect(firstValueFrom(service.uploadVideo(payload, file))).rejects.toBe(uploadError);

    expect(http.post).toHaveBeenLastCalledWith('/api/videos/video-1/upload-failed', {});
  });
});
