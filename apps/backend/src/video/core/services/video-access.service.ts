import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../../users/entities/user.entity.js';
import { Video } from '../entities/video.entity.js';

@Injectable()
export class VideoAccessService {
  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAccessibleVideo(id: string, userId: string, userRole: string): Promise<Video> {
    const video = await this.videosRepository.findOne({
      where: { id },
      relations: ['project', 'comments', 'comments.author'],
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    await this.assertCanAccess(video, userId, userRole);
    return video;
  }

  async assertCanAccess(video: Video, userId: string, userRole: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const userEmail = user?.email;

    if (
      userRole !== 'admin' &&
      video.project.ownerId !== userId &&
      (!userEmail || !video.project.clientEmails?.includes(userEmail))
    ) {
      throw new ForbiddenException('Access denied');
    }
  }
}
