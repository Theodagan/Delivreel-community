import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ProjectAccessLinksService } from './project-access-links.service.js';

describe('ProjectAccessLinksService', () => {
  const linksRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  let service: ProjectAccessLinksService;

  beforeEach(() => {
    jest.clearAllMocks();
    linksRepository.create.mockImplementation((value) => value);
    linksRepository.save.mockImplementation(async (value) => value);
    service = new ProjectAccessLinksService(linksRepository as never);
  });

  it('creates a labeled access link and stores only a token hash', async () => {
    const result = await service.create({
      projectId: 'project-1',
      label: 'Client Review',
      createdByUserId: 1,
      canComment: true,
      canManageSettings: true,
    });

    expect(result.token).toMatch(/^dl_/);
    expect(result.link.tokenHash).toBe(service.hashToken(result.token));
    expect(result.link.label).toBe('Client Review');
    expect(result.link.canComment).toBe(true);
    expect(result.link.canManageSettings).toBe(false);
    expect(result.link.canInviteMembers).toBe(false);
  });

  it('rejects creation without a label', async () => {
    await expect(
      service.create({ projectId: 'project-1', label: ' ', createdByUserId: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves active non-expired tokens and updates last-used timestamp', async () => {
    const token = 'dl_test-token';
    const link = {
      id: 'link-1',
      tokenHash: service.hashToken(token),
      status: 'active',
      expiresAt: null,
      lastUsedAt: null,
    };
    linksRepository.findOne.mockResolvedValue(link);

    await expect(service.resolveToken(token)).resolves.toEqual(expect.objectContaining({ id: 'link-1' }));
    expect(linksRepository.findOne).toHaveBeenCalledWith({ where: { tokenHash: service.hashToken(token) } });
    expect(linksRepository.save).toHaveBeenCalledWith(expect.objectContaining({ lastUsedAt: expect.any(Date) }));
  });

  it('denies revoked tokens', async () => {
    linksRepository.findOne.mockResolvedValue({ status: 'revoked', expiresAt: null });

    await expect(service.resolveToken('dl_revoked')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rotates active links and returns the new raw token once', async () => {
    const link = { id: 'link-1', projectId: 'project-1', status: 'active', tokenHash: 'old-hash' };
    linksRepository.findOne.mockResolvedValue(link);

    const result = await service.rotate('project-1', 'link-1');

    expect(result.token).toMatch(/^dl_/);
    expect(result.link.tokenHash).toBe(service.hashToken(result.token));
  });

  it('serializes links without token hashes', () => {
    const safe = service.serialize({ id: 'link-1', tokenHash: 'secret' } as never);

    expect(safe).toEqual({ id: 'link-1' });
  });

  it('denies expired tokens', async () => {
    linksRepository.findOne.mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.resolveToken('dl_expired')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
