import { firstValueFrom, of } from 'rxjs';

import { MagicLinkService, MagicLinkResolveResponse } from './magic-link.service';

describe('MagicLinkService', () => {
  const makeHttp = () => ({ post: jest.fn() });
  const response: MagicLinkResolveResponse = {
    accessLink: { id: 'link-1', projectId: 'p1', label: 'Review', status: 'active' } as never,
    capabilities: { canView: true } as never,
    target: { type: 'video', projectId: 'p1', videoId: 'v1', route: '/videos/v1' },
  };

  beforeEach(() => localStorage.clear());

  it('resolves and stores magic-link access', async () => {
    const http = makeHttp();
    const service = new MagicLinkService(http as never);
    http.post.mockReturnValue(of(response));

    await firstValueFrom(service.resolve('dl_token'));

    expect(http.post).toHaveBeenCalledWith('/api/magic-links/resolve', { token: 'dl_token' });
    expect(service.getToken()).toBe('dl_token');
    expect(service.getAccess()?.target.route).toBe('/videos/v1');
  });

  it('limits video-scoped access to its video route', () => {
    const service = new MagicLinkService(makeHttp() as never);
    localStorage.setItem('magic_link_access', JSON.stringify(response));

    expect(service.canActivateUrl('/videos/v1')).toBe(true);
    expect(service.canActivateUrl('/videos/v2')).toBe(false);
    expect(service.canActivateUrl('/projects/p1')).toBe(false);
  });
});
