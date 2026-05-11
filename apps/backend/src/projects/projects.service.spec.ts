import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
  };

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(
      projectsRepository as never,
      usersRepository as never,
    );
  });

  it('creates a project for the owner', async () => {
    projectsRepository.create.mockReturnValue({ id: 'p1', ownerId: 'owner-1' });
    projectsRepository.save.mockResolvedValue({ id: 'p1', ownerId: 'owner-1' });

    const result = await service.create({ title: 'Project A' }, 'owner-1');

    expect(projectsRepository.create).toHaveBeenCalledWith({
      title: 'Project A',
      ownerId: 'owner-1',
    });
    expect(result).toEqual({ id: 'p1', ownerId: 'owner-1' });
  });

  it('returns projects visible for the user', async () => {
    projectsRepository.findVisibleForUser.mockResolvedValue([{ id: 'p1' }]);

    await expect(
      service.findAll('user-1', 'client', 'user@example.com'),
    ).resolves.toEqual([{ id: 'p1' }]);
  });

  it('throws NotFoundException when project does not exist', async () => {
    projectsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 'u1', 'client')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when user has no access to project', async () => {
    projectsRepository.findOne.mockResolvedValue({
      id: 'p1',
      ownerId: 'owner-1',
      clientEmails: ['another@example.com'],
      videos: [],
    });
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });

    await expect(service.findOne('p1', 'u1', 'client')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows access when user email is in client list', async () => {
    projectsRepository.findOne.mockResolvedValue({
      id: 'p1',
      ownerId: 'owner-1',
      clientEmails: ['user@example.com'],
      videos: [],
    });
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });

    await expect(service.findOne('p1', 'u1', 'client')).resolves.toEqual(
      expect.objectContaining({ id: 'p1' }),
    );
  });

  it('prevents non-owner non-admin updates', async () => {
    const project = {
      id: 'p1',
      ownerId: 'owner-1',
      clientEmails: [],
      videos: [],
    };
    projectsRepository.findOne.mockResolvedValue(project);
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });

    await expect(
      service.update('p1', { title: 'New' }, 'u1', 'client'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents non-owner non-admin delete', async () => {
    const project = {
      id: 'p1',
      ownerId: 'owner-1',
      clientEmails: [],
      videos: [],
    };
    projectsRepository.findOne.mockResolvedValue(project);
    usersRepository.findOne.mockResolvedValue({ email: 'user@example.com' });

    await expect(service.remove('p1', 'u1', 'client')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
