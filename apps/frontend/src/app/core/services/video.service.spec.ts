import { of, firstValueFrom } from 'rxjs';

import { VideoService, Video } from './video.service';

describe('VideoService', () => {
  const makeHttp = () => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });

  it('calls upload endpoint', async () => {
    const http = makeHttp();
    const service = new VideoService(http as never);
    const payload = new FormData();
    http.get.mockReturnValue(of({ activeProvider: 'local' }));
    http.post.mockReturnValue(of({ provider: 'local', video: { id: 'v1' } }));

    await firstValueFrom(service.uploadVideo(payload));

    expect(http.post).toHaveBeenCalledWith('/api/videos/upload', payload);
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
      project: null,
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
});
