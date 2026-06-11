import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  const projectsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findVisibleForUser: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const projectMembersRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const projectAccessService = {
    assertPermission: jest.fn(),
    findProjectOrThrow: jest.fn(),
    assertProjectPermission: jest.fn(),
    listMembers: jest.fn(),
    getAnonymousAccess: jest.fn(),
    serializeCapabilities: jest.fn(),
  };
  const projectAccessLinksService = {
    listForProject: jest.fn(),
    serialize: jest.fn((link) => link),
  };

  let service: ProjectsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProjectsService(
      projectsRepository as never,
      usersRepository as never,
      projectMembersRepository as never,
      projectAccessService as never,
      projectAccessLinksService as never,
    );
  });

  it('creates a project for the owner', async () => {
    projectsRepository.create.mockReturnValue({ id: 'p1', ownerId: 1 });
    projectsRepository.save.mockResolvedValue({ id: 'p1', ownerId: 1 });
    projectsRepository.findOne.mockResolvedValue({ id: 'p1', ownerId: 1, videos: [], members: [] });
    usersRepository.findOne.mockResolvedValue({ id: 1, email: 'owner@example.com', name: 'Owner' });
    projectMembersRepository.findOne.mockResolvedValue(null);
    projectMembersRepository.create.mockImplementation((member) => member);
    projectMembersRepository.save.mockImplementation(async (member) => member);
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    const result = await service.create({ title: 'Project A' }, 1);

    expect(projectsRepository.create).toHaveBeenCalledWith({
      title: 'Project A',
      ownerId: 1,
    });
    expect(result).toEqual(expect.objectContaining({ id: 'p1', ownerId: 1 }));
  });

  it('returns projects visible for the user', async () => {
    projectsRepository.findVisibleForUser.mockResolvedValue([{ id: 'p1' }]);

    await expect(
      service.findAll(1, 'user@example.com'),
    ).resolves.toEqual([{ id: 'p1' }]);
  });

  it('throws NotFoundException when project does not exist', async () => {
    projectsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when user has no access to project', async () => {
    projectsRepository.findOne.mockResolvedValue({
      id: 'p1',
      ownerId: 1,
      clientEmails: ['another@example.com'],
      videos: [],
    });
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });
    projectAccessService.assertPermission.mockRejectedValue(new ForbiddenException('Access denied'));

    await expect(service.findOne('p1', 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows access when user email is in client list', async () => {
    projectsRepository.findOne.mockResolvedValue({
      id: 'p1',
      ownerId: 1,
      clientEmails: ['user@example.com'],
      videos: [],
    });
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    await expect(service.findOne('p1', 1)).resolves.toEqual(
      expect.objectContaining({ id: 'p1' }),
    );
  });

  it('prevents non-owner non-admin updates', async () => {
    const project = {
      id: 'p1',
      ownerId: 1,
      clientEmails: [],
      videos: [],
    };
    projectsRepository.findOne.mockResolvedValue(project);
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });
    projectAccessService.assertPermission.mockRejectedValue(new ForbiddenException('Access denied'));

    await expect(
      service.update('p1', { title: 'New' }, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents non-owner non-admin delete', async () => {
    const project = {
      id: 'p1',
      ownerId: 1,
      clientEmails: [],
      videos: [],
    };
    projectsRepository.findOne.mockResolvedValue(project);
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });
    projectAccessService.assertPermission.mockRejectedValue(new ForbiddenException('Access denied'));

    await expect(service.remove('p1', 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  describe('approver validation', () => {
    const project = {
      id: 'p1',
      ownerId: 1,
      clientEmails: ['client@example.com'],
      videos: [],
    };

    it('rejects nonexistent approver user', async () => {
      projectsRepository.findOne.mockResolvedValue(project);
      usersRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id === 'nonexistent-id') return Promise.resolve(null);
        return Promise.resolve({ email: 'owner@example.com' });
      });

      await expect(
        service.update('p1', { approverIds: ['nonexistent-id'] }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects inactive approver', async () => {
      projectsRepository.findOne.mockResolvedValue(project);
      usersRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id === 'inactive-client') {
          return Promise.resolve({ id: 'inactive-client', email: 'client@example.com', isActive: false });
        }
        return Promise.resolve({ email: 'owner@example.com' });
      });

      await expect(
        service.update('p1', { approverIds: ['inactive-client'] }, 1),
      ).rejects.toThrow('Approver is inactive');
    });

    it('rejects client not in project', async () => {
      projectsRepository.findOne.mockResolvedValue(project);
      usersRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id === 1) {
          return Promise.resolve({ id: 1, email: 'other@example.com', isActive: true });
        }
        return Promise.resolve({ email: 'owner@example.com' });
      });

      await expect(
        service.update('p1', { approverIds: ['1'] }, 1),
      ).rejects.toThrow('Approver must have project access');
    });

    it('accepts valid client approver', async () => {
      projectsRepository.findOne.mockResolvedValue(project);
      usersRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id === 1) {
          return Promise.resolve({ id: 1, email: 'client@example.com', isActive: true });
        }
        return Promise.resolve({ email: 'owner@example.com' });
      });

      projectsRepository.save.mockResolvedValue({
        ...project,
        approverIds: ['1'],
      });

      await expect(
        service.update('p1', { approverIds: ['1'] }, 1),
      ).resolves.toEqual(expect.objectContaining({ approverIds: ['1'] }));
    });
  });

  describe('findEligibleApprovers', () => {
    it('returns active client users with project access', async () => {
      const project = {
        id: 'p1',
        ownerId: 1,
        clientEmails: ['client1@example.com', 'client2@example.com'],
      };
      projectsRepository.findOne.mockResolvedValue(project);

      const eligibleUsers = [
        { id: 'c1', name: 'Client 1', email: 'client1@example.com', isActive: true },
        { id: 'c2', name: 'Client 2', email: 'client2@example.com', isActive: true },
      ];
      usersRepository.find.mockResolvedValue(eligibleUsers);

      const result = await service.findEligibleApprovers('p1', 1);
      expect(result).toEqual(eligibleUsers);
      expect(usersRepository.find).toHaveBeenCalled();
    });

    it('returns empty array when no client emails', async () => {
      const project = {
        id: 'p1',
        ownerId: 1,
        clientEmails: [],
      };
      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.findEligibleApprovers('p1', 1);
      expect(result).toEqual([]);
    });

    it('rejects non-owner', async () => {
      const project = {
        id: 'p1',
        ownerId: 1,
        clientEmails: ['client1@example.com'],
      };
      projectsRepository.findOne.mockResolvedValue(project);
      projectAccessService.assertPermission.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        service.findEligibleApprovers('p1', 2),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('denies video-scoped magic links from project detail access', async () => {
    projectsRepository.findOne.mockResolvedValue({ id: 'p1', ownerId: 1, videos: [] });

    await expect(
      service.findOne('p1', { principalType: 'magic_link', projectId: 'p1', videoId: 'video-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('project admin transfer safeguards', () => {
    it('allows promoting another member to project admin', async () => {
      const member = {
        id: 'member-2',
        projectId: 'p1',
        role: 'collaborator',
        status: 'active',
        canView: true,
        canManageSettings: false,
      };
      projectAccessService.assertProjectPermission.mockResolvedValue({ id: 'p1' });
      projectMembersRepository.findOne.mockResolvedValue(member);
      projectMembersRepository.find.mockResolvedValue([
        { id: 'other-member', projectId: 'p1', status: 'active', canManageSettings: true },
        member,
      ]);
      projectMembersRepository.save.mockImplementation(async (value) => value);

      await expect(
        service.updateMember('p1', 'member-2', { canManageSettings: true }, { userId: 1 }),
      ).resolves.toEqual(expect.objectContaining({ canManageSettings: true }));
    });

    it('prevents disabling the last project admin', async () => {
      const member = {
        id: 'member-1',
        projectId: 'p1',
        role: 'owner',
        status: 'active',
        canView: true,
        canManageSettings: true,
      };
      projectAccessService.assertProjectPermission.mockResolvedValue({ id: 'p1' });
      projectMembersRepository.findOne.mockResolvedValue(member);
      projectMembersRepository.find.mockResolvedValue([member]);

      await expect(
        service.updateMember('p1', 'member-1', { status: 'disabled' }, { userId: 1 }),
      ).rejects.toThrow('Project must keep at least one active admin');
    });

    it('prevents removing the last project admin', async () => {
      const member = {
        id: 'member-1',
        projectId: 'p1',
        role: 'owner',
        status: 'active',
        canManageSettings: true,
      };
      projectAccessService.assertProjectPermission.mockResolvedValue({ id: 'p1' });
      projectMembersRepository.findOne.mockResolvedValue(member);
      projectMembersRepository.find.mockResolvedValue([member]);

      await expect(
        service.removeMember('p1', 'member-1', { userId: 1 }),
      ).rejects.toThrow('Project must keep at least one active admin');
    });
  });
});
