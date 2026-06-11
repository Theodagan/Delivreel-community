import { of, firstValueFrom } from 'rxjs';

import { ProjectService } from './project.service';

describe('ProjectService', () => {
  const makeHttp = () => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });

  it('fetches all projects', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.get.mockReturnValue(of([{ id: 'p1' }]));

    await firstValueFrom(service.getProjects());

    expect(http.get).toHaveBeenCalledWith('/api/projects');
  });

  it('fetches a project by id', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.get.mockReturnValue(of({ id: 'p1' }));

    await firstValueFrom(service.getProject('p1'));

    expect(http.get).toHaveBeenCalledWith('/api/projects/p1');
  });

  it('creates a project', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.post.mockReturnValue(of({ id: 'p1' }));

    await firstValueFrom(service.createProject({ title: 'Demo' }));

    expect(http.post).toHaveBeenCalledWith('/api/projects', { title: 'Demo' });
  });

  it('updates a project', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.patch.mockReturnValue(of({ id: 'p1' }));

    await firstValueFrom(service.updateProject('p1', { title: 'Updated' }));

    expect(http.patch).toHaveBeenCalledWith('/api/projects/p1', { title: 'Updated' });
  });

  it('deletes a project', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.delete.mockReturnValue(of(undefined));

    await firstValueFrom(service.deleteProject('p1'));

    expect(http.delete).toHaveBeenCalledWith('/api/projects/p1');
  });

  it('creates a project access link through settings API', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.post.mockReturnValue(of({ token: 'dl_token' }));

    await firstValueFrom(service.createProjectAccessLink('p1', { label: 'Client Review', canView: true }));

    expect(http.post).toHaveBeenCalledWith('/api/projects/p1/settings/access-links', {
      label: 'Client Review',
      canView: true,
    });
  });

  it('revokes a project access link', async () => {
    const http = makeHttp();
    const service = new ProjectService(http as never);
    http.post.mockReturnValue(of({ id: 'link-1', status: 'revoked' }));

    await firstValueFrom(service.revokeProjectAccessLink('p1', 'link-1'));

    expect(http.post).toHaveBeenCalledWith('/api/projects/p1/settings/access-links/link-1/revoke', {});
  });
});
