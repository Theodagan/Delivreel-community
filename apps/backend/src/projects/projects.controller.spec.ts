import { ForbiddenException } from '@nestjs/common';

import { ProjectsController } from './projects.controller.js';

describe('ProjectsController access link endpoints', () => {
  const projectsService = {
    getSettings: jest.fn(),
  };
  const accessLinksService = {
    create: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    rotate: jest.fn(),
    serialize: jest.fn(),
  };
  const req = { user: { userId: 'user-1' } };

  let controller: ProjectsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProjectsController(projectsService as never, accessLinksService as never);
  });

  it('creates an access link through project settings and returns the raw token once', async () => {
    projectsService.getSettings.mockResolvedValue({ capabilities: { canManageSettings: true } });
    accessLinksService.create.mockResolvedValue({ link: { id: 'link-1', tokenHash: 'hash' }, token: 'dl_token' });
    accessLinksService.serialize.mockReturnValue({ id: 'link-1' });

    await expect(
      controller.createAccessLink('project-1', { label: 'Client Review' }, req),
    ).resolves.toEqual({ accessLink: { id: 'link-1' }, token: 'dl_token' });

    expect(accessLinksService.create).toHaveBeenCalledWith({
      label: 'Client Review',
      projectId: 'project-1',
      createdByUserId: 'user-1',
    });
  });

  it('denies access link management without project settings permission', async () => {
    projectsService.getSettings.mockResolvedValue({ capabilities: { canManageSettings: false } });

    await expect(
      controller.revokeAccessLink('project-1', 'link-1', req),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
