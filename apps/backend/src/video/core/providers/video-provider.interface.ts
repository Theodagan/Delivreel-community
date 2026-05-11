import { CreateVideoDto } from '../dto/create-video.dto.js';
import { PlaybackSourceDto } from '../dto/playback-source.dto.js';
import { UpdateVideoDto } from '../dto/update-video.dto.js';
import { Video } from '../entities/video.entity.js';
import { UploadResult } from '../types/video-provider.types.js';

export interface VideoUserContext {
  userId: string;
  userRole: string;
}

export interface VideoProvider {
  readonly id: string;
  createUpload(
    createVideoDto: CreateVideoDto,
    file: Express.Multer.File | undefined,
    userContext: VideoUserContext,
  ): Promise<UploadResult>;
  replaceUpload(
    video: Video,
    updateVideoDto: UpdateVideoDto,
    file: Express.Multer.File | undefined,
    userContext: VideoUserContext,
  ): Promise<UploadResult>;
  deleteAsset(video: Video): Promise<void>;
  supportsPlayback(video: Video): Promise<boolean> | boolean;
  getPlaybackSource(video: Video, userContext: VideoUserContext): Promise<PlaybackSourceDto>;
}
