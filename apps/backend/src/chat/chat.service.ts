import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMessage } from './entities/chat-message.entity.js';
import { Video } from '../video/core/entities/video.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ProjectAccessContext, ProjectAccessService } from '../projects/project-access.service.js';

@Injectable()
export class ChatService {
  private readonly MAX_RECENT_MESSAGES = 100;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async assertCanView(videoId: string, context: ProjectAccessContext): Promise<void> {
    const video = await this.findVideo(videoId);
    await this.projectAccessService.assertPermission(video.project, context, 'canView');
  }

  async getRecentMessages(videoId: string, context: ProjectAccessContext, limit = 50): Promise<ChatMessage[]> {
    await this.assertCanView(videoId, context);
    return this.chatMessageRepository.find({
      where: { videoId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, this.MAX_RECENT_MESSAGES),
    }).then(messages => messages.reverse());
  }

  async createMessage(videoId: string, context: ProjectAccessContext, message: string): Promise<ChatMessage> {
    const video = await this.findVideo(videoId);
    await this.projectAccessService.assertPermission(video.project, context, 'canComment');
    if (video.signedOffAt) {
      throw new ForbiddenException('Cannot chat on a signed-off video');
    }

    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message is required');
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException('Message is too long');
    }

    const userId = context.userId!;
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const chatMessage = this.chatMessageRepository.create({
      videoId,
      userId,
      userName: user?.name ?? user?.email ?? 'User',
      message: trimmed,
    });

    const saved = await this.chatMessageRepository.save(chatMessage);

    // Rolling policy: keep only the last MAX_RECENT_MESSAGES per video
    const totalMessages = await this.chatMessageRepository.count({ where: { videoId } });
    if (totalMessages > this.MAX_RECENT_MESSAGES) {
      const excess = totalMessages - this.MAX_RECENT_MESSAGES;
      const oldestMessages = await this.chatMessageRepository.find({
        where: { videoId },
        order: { createdAt: 'ASC' },
        take: excess,
      });
      if (oldestMessages.length > 0) {
        await this.chatMessageRepository.remove(oldestMessages);
      }
    }

    return saved;
  }

  private async findVideo(videoId: string): Promise<Video> {
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
