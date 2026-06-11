import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Comment } from './entities/comment.entity.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { ProjectAccessContext } from '../projects/project-access.service.js';
import { Video } from '../video/core/entities/video.entity.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Video)
    private videosRepository: Repository<Video>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(createCommentDto: CreateCommentDto, context: ProjectAccessContext | number): Promise<Comment> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const authorId = accessContext.userId!;
    const video = await this.findVideoForAccess(createCommentDto.videoId);
    if (accessContext.principalType === 'magic_link' && accessContext.videoId && accessContext.videoId !== video.id) {
      throw new ForbiddenException('Magic link is limited to a different video');
    }
    await this.projectAccessService.assertPermission(video.project, accessContext, 'canComment');
    if (video.signedOffAt) throw new ForbiddenException('Cannot comment on a signed-off video');

    if (createCommentDto.parentCommentId) {
      const parent = await this.commentsRepository.findOne({ where: { id: createCommentDto.parentCommentId } });
      if (!parent) throw new BadRequestException('Parent comment not found');
      if (parent.videoId !== createCommentDto.videoId) throw new BadRequestException('Reply must belong to the same video');
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      authorId,
      authorAccessLinkId: accessContext.accessLinkId ?? null,
      authorAccessLinkLabel: accessContext.accessLinkLabel ?? null,
    });

    return this.commentsRepository.save(comment);
  }

  async findByVideo(videoId: string, context: ProjectAccessContext | number): Promise<Comment[]> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const video = await this.findVideoForAccess(videoId);
    if (accessContext.principalType === 'magic_link' && accessContext.videoId && accessContext.videoId !== video.id) {
      throw new ForbiddenException('Magic link is limited to a different video');
    }
    await this.projectAccessService.assertPermission(video.project, accessContext, 'canView');
    return this.commentsRepository.find({
      where: { videoId, parentCommentId: IsNull() },
      relations: ['author', 'replies', 'replies.author'],
      order: { timestamp: 'ASC', replies: { timestamp: 'ASC' } },
    });
  }

  async findOne(id: string, context?: ProjectAccessContext | number): Promise<Comment> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'video', 'video.project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (accessContext) {
      if (accessContext.principalType === 'magic_link' && accessContext.videoId && accessContext.videoId !== comment.videoId) {
        throw new ForbiddenException('Magic link is limited to a different video');
      }
      await this.projectAccessService.assertPermission(comment.video.project, accessContext, 'canView');
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, context: ProjectAccessContext | number): Promise<Comment> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const comment = await this.findOne(id, accessContext);

    if (comment.authorId !== accessContext.userId || comment.authorAccessLinkId !== (accessContext.accessLinkId ?? null)) {
      throw new ForbiddenException('Access denied');
    }

    const video = await this.videosRepository.findOne({ where: { id: comment.videoId } });
    if (video?.signedOffAt) throw new ForbiddenException('Cannot edit comments on a signed-off video');

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, context: ProjectAccessContext | number): Promise<void> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const comment = await this.findOne(id, accessContext);

    if (comment.authorId !== accessContext.userId || comment.authorAccessLinkId !== (accessContext.accessLinkId ?? null)) {
      throw new ForbiddenException('Access denied');
    }

    await this.commentsRepository.remove(comment);
  }

  async resolve(id: string, context: ProjectAccessContext | number): Promise<Comment> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const userId = accessContext.userId!;
    const comment = await this.findOne(id, accessContext);

    await this.projectAccessService.assertPermission(comment.video.project, accessContext, 'canResolveComments');

    comment.resolved = true;
    comment.resolvedAt = new Date();
    comment.resolvedBy = userId;

    return this.commentsRepository.save(comment);
  }

  private async findVideoForAccess(videoId: string): Promise<Video> {
    const video = await this.videosRepository.findOne({
      where: { id: videoId },
      relations: ['project'],
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return video;
  }
}
