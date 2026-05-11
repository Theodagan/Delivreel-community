import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { CommentsService } from './comments.service.js';

describe('CommentsService', () => {
  const commentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  let service: CommentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommentsService(commentsRepository as never);
  });

  it('creates a comment for the given author', async () => {
    commentsRepository.create.mockReturnValue({ id: 'c1', authorId: 'u1' });
    commentsRepository.save.mockResolvedValue({ id: 'c1', authorId: 'u1' });

    const result = await service.create(
      { text: 'Hello', timestamp: 5, videoId: 'v1' },
      'u1',
    );

    expect(commentsRepository.create).toHaveBeenCalledWith({
      text: 'Hello',
      timestamp: 5,
      videoId: 'v1',
      authorId: 'u1',
    });
    expect(result).toEqual({ id: 'c1', authorId: 'u1' });
  });

  it('finds comments by video in ascending timestamp order', async () => {
    commentsRepository.find.mockResolvedValue([{ id: 'c1' }]);

    await expect(service.findByVideo('v1')).resolves.toEqual([{ id: 'c1' }]);
    expect(commentsRepository.find).toHaveBeenCalledWith({
      where: { videoId: 'v1' },
      relations: ['author'],
      order: { timestamp: 'ASC' },
    });
  });

  it('throws NotFoundException when comment is missing', async () => {
    commentsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks update when user is not author or admin', async () => {
    commentsRepository.findOne.mockResolvedValue({
      id: 'c1',
      authorId: 'author-1',
      video: { project: { ownerId: 'owner-1' } },
    });

    await expect(
      service.update('c1', { text: 'Updated' }, 'user-2', 'client'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolves a comment when user is project owner', async () => {
    const comment = {
      id: 'c1',
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      authorId: 'author-1',
      video: { project: { ownerId: 'owner-1' } },
    };
    commentsRepository.findOne.mockResolvedValue(comment);
    commentsRepository.save.mockResolvedValue({ ...comment, resolved: true });

    const result = await service.resolve('c1', 'owner-1', 'client');

    expect(commentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ resolved: true, resolvedBy: 'owner-1' }),
    );
    expect(result).toEqual(expect.objectContaining({ resolved: true }));
  });
});
