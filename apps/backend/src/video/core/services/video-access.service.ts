import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../../users/entities/user.entity.js';
import { ProjectAccessService } from '../../../projects/project-access.service.js';
import { ProjectAccessContext } from '../../../projects/project-access.service.js';
import { Video } from '../entities/video.entity.js';

@Injectable()
export class VideoAccessService {
  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async findAccessibleVideo(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const video = await this.videosRepository.findOne({
      where: { id },
      relations: ['project', 'comments', 'comments.author'],
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    await this.assertCanAccess(video, accessContext);
    return video;
  }

  async assertCanAccess(video: Video, context: ProjectAccessContext): Promise<void> {
    if (context.principalType === 'magic_link' && context.videoId && context.videoId !== video.id) {
      throw new ForbiddenException('Magic link is limited to a different video');
    }
    const user = context.userId ? await this.usersRepository.findOne({ where: { id: context.userId } }) : null;
    const userEmail = user?.email;

    await this.projectAccessService.assertPermission(video.project, { ...context, userEmail }, 'canView');
  }
}
