import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Comment } from './entities/comment.entity.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto, authorId: string): Promise<Comment> {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      authorId,
    });

    return this.commentsRepository.save(comment);
  }

  async findByVideo(videoId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { videoId },
      relations: ['author'],
      order: { timestamp: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'video', 'video.project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string, userRole: string): Promise<Comment> {
    const comment = await this.findOne(id);

    // Only author or admin can update
    if (userRole !== 'admin' && comment.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const comment = await this.findOne(id);

    // Only author or admin can delete
    if (userRole !== 'admin' && comment.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.commentsRepository.remove(comment);
  }

  async resolve(id: string, userId: string, userRole: string): Promise<Comment> {
    const comment = await this.findOne(id);

    // Only admin or project owner can resolve
    if (userRole !== 'admin' && comment.video?.project?.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    comment.resolved = true;
    comment.resolvedAt = new Date();
    comment.resolvedBy = userId;

    return this.commentsRepository.save(comment);
  }
}