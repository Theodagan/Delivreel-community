import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { CreateVideoDto } from '../core/dto/create-video.dto.js';
import { UpdateVideoDto } from '../core/dto/update-video.dto.js';
import { Video } from '../core/entities/video.entity.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { UploadResult } from '../core/types/video-provider.types.js';
import { VideoAccessService } from '../core/services/video-access.service.js';

@Injectable()
export class VideoGatewayService {
  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly videoAccessService: VideoAccessService,
    private readonly videoProviderRegistry: VideoProviderRegistry,
  ) {}

  async create(
    createVideoDto: CreateVideoDto,
    file: Express.Multer.File | undefined,
    userId: string,
    userRole: string,
  ): Promise<UploadResult> {
    const project = await this.projectsRepository.findOne({ where: { id: createVideoDto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (userRole !== 'admin' && project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.videoProviderRegistry.getUploadProvider().createUpload(createVideoDto, file, { userId, userRole });
  }

  async findAll(userId: string, userRole: string): Promise<Video[]> {
    if (userRole === 'admin') {
      return this.videosRepository.find({
        relations: ['project', 'comments'],
        order: { createdAt: 'DESC' },
      });
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const userEmail = user?.email;
    const videos = await this.videosRepository.find({
      relations: ['project', 'comments'],
      order: { createdAt: 'DESC' },
    });

    return videos.filter((video) =>
      video.project.ownerId === userId ||
      (!!userEmail && !!video.project.clientEmails?.includes(userEmail))
    );
  }

  findOne(id: string, userId: string, userRole: string): Promise<Video> {
    return this.videoAccessService.findAccessibleVideo(id, userId, userRole);
  }

  async update(
    id: string,
    updateVideoDto: UpdateVideoDto,
    file: Express.Multer.File | undefined,
    userId: string,
    userRole: string,
  ): Promise<Video | UploadResult> {
    const video = await this.findOne(id, userId, userRole);

    if (userRole !== 'admin' && video.project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!file) {
      Object.assign(video, updateVideoDto);
      return this.videosRepository.save(video);
    }

    return this.videoProviderRegistry.getUploadProvider().replaceUpload(video, updateVideoDto, file, { userId, userRole });
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const video = await this.findOne(id, userId, userRole);

    if (userRole !== 'admin' && video.project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const provider = await this.videoProviderRegistry.getPlaybackProvider(video);
    await provider.deleteAsset(video);
    await this.videosRepository.remove(video);
  }
}
