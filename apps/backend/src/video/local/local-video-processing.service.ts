import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { rm } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';

import { CreateVideoDto } from '../core/dto/create-video.dto.js';
import { PlaybackSourceDto } from '../core/dto/playback-source.dto.js';
import { UpdateVideoDto } from '../core/dto/update-video.dto.js';
import { Video } from '../core/entities/video.entity.js';
import { VideoDownloadSource, VideoProvider, VideoUserContext } from '../core/providers/video-provider.interface.js';
import { EncodingMonitorService } from '../core/services/encoding-monitor.service.js';
import { VideoTelemetryService } from '../core/services/video-telemetry.service.js';
import { UploadResult } from '../core/types/video-provider.types.js';
import { TranscodeService } from './transcode.service.js';

@Injectable()
export class LocalVideoProcessingService implements VideoProvider {
  readonly id = 'local';

  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
    private readonly transcodeService: TranscodeService,
    private readonly telemetryService: VideoTelemetryService,
    private readonly encodingMonitorService: EncodingMonitorService,
  ) {}

  async createUpload(
    createVideoDto: CreateVideoDto,
    file: Express.Multer.File | undefined,
    userContext: VideoUserContext,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    const video = this.videosRepository.create({
      ...createVideoDto,
      originalFilename: file.originalname,
      filename: file.filename,
      filepath: file.path,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: userContext.userId,
      status: 'processing',
      hlsPath: null,
    });

    const savedVideo = await this.videosRepository.save(video);

    this.telemetryService.increment('video_upload_total', { provider: 'local' });
    this.telemetryService.log('upload.created', {
      provider: 'local',
      videoId: savedVideo.id,
    });

    this.encodingMonitorService.checkEncodingDelay({
      videoId: savedVideo.id,
      provider: 'local',
      createdAt: savedVideo.createdAt,
    });

    this.startTranscode(savedVideo.id, file.path, 'local');
    return { provider: 'local', video: savedVideo };
  }

  async replaceVideo(video: Video, updateVideoDto: UpdateVideoDto, file: Express.Multer.File | undefined, userId: number): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }

    const previousFilepath = video.filepath;
    const previousHlsPath = join(process.cwd(), 'hls', video.id);

    video.title = updateVideoDto.title ?? video.title;
    video.description = updateVideoDto.description ?? video.description;
    video.originalFilename = file.originalname;
    video.filename = file.filename;
    video.filepath = file.path;
    video.size = file.size;
    video.mimeType = file.mimetype;
    video.uploadedBy = userId;
    video.status = 'processing';
    video.hlsPath = null;
    video.duration = null;

    const savedVideo = await this.videosRepository.save(video);
    await Promise.all([
      this.removePath(previousFilepath),
      this.removePath(previousHlsPath),
    ]);
    this.startTranscode(savedVideo.id, file.path, 'local');

    return { provider: 'local', video: savedVideo };
  }

  replaceUpload(
    video: Video,
    updateVideoDto: UpdateVideoDto,
    file: Express.Multer.File | undefined,
    userContext: VideoUserContext,
  ) {
    return this.replaceVideo(video, updateVideoDto, file, userContext.userId);
  }

  async deleteAsset(video: Video): Promise<void> {
    await Promise.all([
      this.removePath(video.filepath),
      this.removePath(join(process.cwd(), 'hls', video.id)),
    ]);
  }

  supportsPlayback(video: Video): boolean {
    return !!video.hlsPath && video.status === 'ready';
  }

  async getPlaybackSource(video: Video): Promise<PlaybackSourceDto> {
    return { type: 'local', manifestUrl: `/api/stream/${video.id}/manifest.m3u8` };
  }

  supportsDownload(video: Video): boolean {
    return !!video.filepath && video.status === 'ready';
  }

  async getDownloadSource(video: Video): Promise<VideoDownloadSource> {
    if (!this.supportsDownload(video)) {
      throw new BadRequestException('Download is not available for this video');
    }
    return {
      type: 'file',
      path: video.filepath,
      filename: video.originalFilename || video.filename,
      mimeType: video.mimeType || 'application/octet-stream',
    };
  }

  startTranscode(videoId: string, inputPath: string, provider: string) {
    this.transcodeService.transcodeVideo(videoId, inputPath).catch((error) => {
      this.telemetryService.log('upload.transcode_failed', {
        provider,
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.encodingMonitorService.notifyRetry({
        provider,
        videoId,
        attempt: 1,
        reason: 'transcode_failed',
      });
      console.error('Transcoding failed:', error);
    });
  }

  private async removePath(path?: string | null): Promise<void> {
    if (!path) {
      return;
    }
    await rm(path, { recursive: true, force: true }).catch(() => undefined);
  }
}
