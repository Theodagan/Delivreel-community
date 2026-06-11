import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { CommentsService } from './comments.service.js';

describe('CommentsService', () => {
  const commentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const videosRepository = {
    findOne: jest.fn(),
  };
  const projectAccessService = {
    assertPermission: jest.fn(),
  };

  let service: CommentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CommentsService(
      commentsRepository as never,
      videosRepository as never,
      projectAccessService as never,
    );
  });

  it('creates a comment for the given author', async () => {
    commentsRepository.create.mockReturnValue({ id: 'c1', authorId: 1 });
    commentsRepository.save.mockResolvedValue({ id: 'c1', authorId: 1 });
    videosRepository.findOne.mockResolvedValue({ id: 'v1', project: { id: 'p1' } });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    const result = await service.create(
      { text: 'Hello', timestamp: 5, videoId: 'v1' },
      1,
    );

    expect(commentsRepository.create).toHaveBeenCalledWith({
      text: 'Hello',
      timestamp: 5,
      videoId: 'v1',
      authorId: 1,
      authorAccessLinkId: null,
      authorAccessLinkLabel: null,
    });
    expect(result).toEqual({ id: 'c1', authorId: 1 });
  });

  it('records magic-link attribution when creating comments', async () => {
    commentsRepository.create.mockReturnValue({ id: 'c1', authorAccessLinkId: 'link-1' });
    commentsRepository.save.mockResolvedValue({ id: 'c1', authorAccessLinkId: 'link-1' });
    videosRepository.findOne.mockResolvedValue({ id: 'v1', project: { id: 'p1' } });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    await service.create({ text: 'Hello', timestamp: 5, videoId: 'v1' }, {
      principalType: 'magic_link',
      userId: 1,
      accessLinkId: 'link-1',
      accessLinkLabel: 'Client Review',
      projectId: 'p1',
      permissions: { canView: true, canComment: true } as any,
    });

    expect(commentsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      authorId: 1,
      authorAccessLinkId: 'link-1',
      authorAccessLinkLabel: 'Client Review',
    }));
  });

  it('rejects reply with mismatched videoId', async () => {
    videosRepository.findOne.mockResolvedValue({ id: 'v1', signedOffAt: null, project: { id: 'p1' } });
    projectAccessService.assertPermission.mockResolvedValue(undefined);
    commentsRepository.findOne.mockResolvedValue({ id: 'p1', videoId: 'other-video' });

    await expect(
      service.create({ text: 'Reply', timestamp: 5, videoId: 'v1', parentCommentId: 'p1' }, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finds comments by video in ascending timestamp order', async () => {
    commentsRepository.find.mockResolvedValue([{ id: 'c1' }]);
    videosRepository.findOne.mockResolvedValue({ id: 'v1', project: { id: 'p1' } });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    await expect(service.findByVideo('v1', 1)).resolves.toEqual([{ id: 'c1' }]);
    expect(commentsRepository.find).toHaveBeenCalledWith({
      where: { videoId: 'v1', parentCommentId: IsNull() },
      relations: ['author', 'replies', 'replies.author'],
      order: { timestamp: 'ASC', replies: { timestamp: 'ASC' } },
    });
  });

  it('throws NotFoundException when comment is missing', async () => {
    commentsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks update when user is not author', async () => {
    commentsRepository.findOne.mockResolvedValue({
      id: 'c1',
      authorId: 1,
      video: { project: { ownerId: 2 } },
    });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    await expect(
      service.update('c1', { text: 'Updated' }, 2),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolves a comment when user is project owner', async () => {
    const comment = {
      id: 'c1',
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      authorId: 1,
      video: { project: { ownerId: 2 } },
    };
    commentsRepository.findOne.mockResolvedValue(comment);
    commentsRepository.save.mockResolvedValue({ ...comment, resolved: true });
    projectAccessService.assertPermission.mockResolvedValue(undefined);

    const result = await service.resolve('c1', 2);

    expect(commentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ resolved: true, resolvedBy: 2 }),
    );
    expect(result).toEqual(expect.objectContaining({ resolved: true }));
  });
});
