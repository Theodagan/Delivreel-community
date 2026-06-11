import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {} from 'express';
import type {} from 'multer';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { CreateVideoDto } from '../core/dto/create-video.dto.js';
import { UpdateVideoDto } from '../core/dto/update-video.dto.js';
import { Video, VideoStatus } from '../core/entities/video.entity.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { UploadResult } from '../core/types/video-provider.types.js';
import { VideoAccessService } from '../core/services/video-access.service.js';
import { ProjectAccessService } from '../../projects/project-access.service.js';
import { ProjectAccessContext } from '../../projects/project-access.service.js';
import { UpdateVideoSettingsDto } from '../core/dto/update-video-settings.dto.js';
import { VideoDownloadSource } from '../core/providers/video-provider.interface.js';
import { UploadAccessPolicy } from '../../upload-access/upload-access-policy.interface.js';
import { UPLOAD_ACCESS_POLICY } from '../../upload-access/upload-access-policy.token.js';

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
    private readonly projectAccessService: ProjectAccessService,
    private readonly videoProviderRegistry: VideoProviderRegistry,
    @Inject(UPLOAD_ACCESS_POLICY)
    private readonly uploadAccessPolicy: UploadAccessPolicy,
  ) {}

  async create(
    createVideoDto: CreateVideoDto,
    file: Express.Multer.File | undefined,
    context: ProjectAccessContext,
  ): Promise<UploadResult> {
    const userId = context.userId!;
    const project = await this.projectsRepository.findOne({ where: { id: createVideoDto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.projectAccessService.assertPermission(project, context, 'canUploadVideos');

    await this.uploadAccessPolicy.assertCanStartUpload(userId, createVideoDto.projectId);

    const uploadProvider = this.videoProviderRegistry.getUploadProvider();
    let result: UploadResult | null = null;

    try {
      result = await uploadProvider.createUpload(createVideoDto, file, { userId });
      await this.uploadAccessPolicy.consumeOnUploadCreated(userId, createVideoDto.projectId, result.video.id);
      return result;
    } catch (error) {
      if (result?.video) {
        await uploadProvider.deleteAsset(result.video);
        await this.videosRepository.remove(result.video);
      }
      await this.uploadAccessPolicy.releaseOnUploadFailed(userId, createVideoDto.projectId, result?.video.id);
      throw error;
    }
  }

  async reportUploadFailed(id: string, context: ProjectAccessContext): Promise<void> {
    const userId = context.userId!;
    const video = await this.findOne(id, context);

    await this.projectAccessService.assertPermission(video.project, context, 'canUploadVideos');

    const provider = this.videoProviderRegistry.getUploadProvider();
    await provider.deleteAsset(video);
    await this.uploadAccessPolicy.releaseOnUploadFailed(userId, video.projectId, video.id);
    await this.videosRepository.remove(video);
  }

  async findAll(userId: number): Promise<Video[]> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const userEmail = user?.email;
    const videos = await this.videosRepository.find({
      relations: ['project', 'comments'],
      order: { createdAt: 'DESC' },
    });

    return videos.filter((video) =>
      video.project.ownerId === userId ||
      (!!userEmail && !!video.project.clientEmails?.includes(userEmail)) ||
      video.project.members?.some((member) =>
        member.status !== 'disabled' && (member.userId === userId || member.email === userEmail)
      )
    );
  }

  async findOne(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const video = await this.videoAccessService.findAccessibleVideo(id, accessContext);
    const access = await this.projectAccessService.resolveAccess(video.project, accessContext);
    const downloadSupported = video.status === 'ready'
      ? await this.resolveDownloadSupport(video)
      : false;
    Object.assign(video, {
      capabilities: access.permissions,
      downloadAllowed: !!video.downloadEnabled && access.permissions.canDownloadVideos && downloadSupported,
      downloadSupported,
    });
    return video;
  }

  async getStatus(id: string, context: ProjectAccessContext | number): Promise<{
    id: string;
    status: VideoStatus;
    updatedAt: Date;
    provider?: string;
  }> {
    let video = await this.findOne(id, context);
    const provider = this.videoProviderRegistry.getUploadProvider();

    if (video.status === 'processing' && provider.reconcileProcessingStatus) {
      video = await provider.reconcileProcessingStatus(video);
    }

    return {
      id: video.id,
      status: video.status,
      updatedAt: video.updatedAt,
      provider: provider.id,
    };
  }

  async update(
    id: string,
    updateVideoDto: UpdateVideoDto,
    file: Express.Multer.File | undefined,
    context: ProjectAccessContext,
  ): Promise<Video | UploadResult> {
    const userId = context.userId!;
    const video = await this.findOne(id, context);

    await this.projectAccessService.assertPermission(video.project, context, 'canUploadVideos');

    if (!file) {
      Object.assign(video, updateVideoDto);
      return this.videosRepository.save(video);
    }

    return this.videoProviderRegistry.getUploadProvider().replaceUpload(video, updateVideoDto, file, { userId });
  }

  async remove(id: string, context: ProjectAccessContext): Promise<void> {
    const video = await this.findOne(id, context);

    await this.projectAccessService.assertPermission(video.project, context, 'canUploadVideos');

    const provider = await this.videoProviderRegistry.getPlaybackProvider(video);
    await provider.deleteAsset(video);
    await this.videosRepository.remove(video);
  }

  async approve(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = this.normalizeAccessContext(context);
    const userId = accessContext.userId!;
    const video = await this.findOne(id, accessContext);

    await this.projectAccessService.assertPermission(video.project, accessContext, 'canApproveVideos');
    if (video.approvedAt) throw new BadRequestException('Video already approved');

    video.approvedAt = new Date();
    video.approvedBy = userId;
    await this.videosRepository.save(video);
    return this.findOne(id, accessContext);
  }

  async revokeApproval(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = this.normalizeAccessContext(context);
    const userId = accessContext.userId!;
    const video = await this.findOne(id, accessContext);

    const access = await this.projectAccessService.resolveAccess(video.project, accessContext);
    if (!access.permissions.canApproveVideos && video.approvedBy !== userId) {
      throw new ForbiddenException('Only the original approver or project admin can revoke approval');
    }
    if (!video.approvedAt) throw new BadRequestException('Video is not approved');

    video.approvedAt = null as any;
    video.approvedBy = null as any;
    await this.videosRepository.save(video);
    return this.findOne(id, accessContext);
  }

  async signOff(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = this.normalizeAccessContext(context);
    const userId = accessContext.userId!;
    const video = await this.findOne(id, accessContext);

    await this.projectAccessService.assertPermission(video.project, accessContext, 'canSignOffVideos');
    if (video.signedOffAt) throw new BadRequestException('Video already signed off');

    video.signedOffAt = new Date();
    video.signedOffBy = userId;
    await this.videosRepository.save(video);
    return this.findOne(id, accessContext);
  }

  async revokeSignOff(id: string, context: ProjectAccessContext | number): Promise<Video> {
    const accessContext = this.normalizeAccessContext(context);
    const userId = accessContext.userId!;
    const video = await this.findOne(id, accessContext);

    const access = await this.projectAccessService.resolveAccess(video.project, accessContext);
    if (!access.permissions.canSignOffVideos && video.signedOffBy !== userId) {
      throw new ForbiddenException('Only the original signer or project admin can revoke sign-off');
    }
    if (!video.signedOffAt) throw new BadRequestException('Video is not signed off');

    video.signedOffAt = null as any;
    video.signedOffBy = null as any;
    await this.videosRepository.save(video);
    return this.findOne(id, accessContext);
  }

  private normalizeAccessContext(context: ProjectAccessContext | number): ProjectAccessContext {
    return typeof context === 'number' ? { userId: context } : context;
  }

  async archive(id: string, context: ProjectAccessContext): Promise<Video> {
    const userId = context.userId!;
    const video = await this.findOne(id, context);
    await this.projectAccessService.assertPermission(video.project, context, 'canManageSettings');
    if (video.archivedAt) throw new BadRequestException('Video already archived');
    video.archivedAt = new Date();
    video.archivedBy = userId;
    await this.videosRepository.save(video);
    return this.findOne(id, context);
  }

  async restoreVideo(id: string, context: ProjectAccessContext): Promise<Video> {
    const userId = context.userId!;
    const video = await this.videosRepository.findOne({ where: { id }, relations: ['project'] });
    if (!video) throw new NotFoundException('Video not found');
    await this.projectAccessService.assertPermission(video.project, context, 'canManageSettings');
    if (!video.archivedAt) throw new BadRequestException('Video is not archived');
    video.archivedAt = null as any;
    video.archivedBy = null as any;
    await this.videosRepository.save(video);
    return this.findOne(id, context);
  }

  async updateSettings(id: string, dto: UpdateVideoSettingsDto, context: ProjectAccessContext): Promise<Video> {
    const video = await this.findOne(id, context);
    await this.projectAccessService.assertPermission(video.project, context, 'canManageSettings');
    if (dto.downloadEnabled !== undefined) {
      video.downloadEnabled = dto.downloadEnabled;
    }
    await this.videosRepository.save(video);
    return this.findOne(id, context);
  }

  async getDownloadSource(id: string, context: ProjectAccessContext): Promise<VideoDownloadSource> {
    const userId = context.userId!;
    const video = await this.findOne(id, context);
    await this.projectAccessService.assertPermission(video.project, context, 'canDownloadVideos');
    if (!video.downloadEnabled) {
      throw new ForbiddenException('Downloads are disabled for this video');
    }
    if (video.status !== 'ready') {
      throw new BadRequestException('Video is not ready for download');
    }
    const provider = await this.videoProviderRegistry.getPlaybackProvider(video);
    if (!(await provider.supportsDownload(video))) {
      throw new BadRequestException('Download is not supported for this video provider');
    }
    return provider.getDownloadSource(video, { userId });
  }

  private async resolveDownloadSupport(video: Video): Promise<boolean> {
    try {
      const provider = await this.videoProviderRegistry.getPlaybackProvider(video);
      return !!(await provider.supportsDownload(video));
    } catch {
      return false;
    }
  }
}
