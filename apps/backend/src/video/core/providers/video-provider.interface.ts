import { CreateVideoDto } from '../dto/create-video.dto.js';
import { PlaybackSourceDto } from '../dto/playback-source.dto.js';
import { UpdateVideoDto } from '../dto/update-video.dto.js';
import { Video } from '../entities/video.entity.js';
import { UploadResult } from '../types/video-provider.types.js';

export interface VideoUserContext {
  userId: number;
}

export type VideoDownloadSource =
  | { type: 'file'; path: string; filename: string; mimeType: string }
  | { type: 'remote'; url: string };

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
  supportsDownload(video: Video): Promise<boolean> | boolean;
  getDownloadSource(video: Video, userContext: VideoUserContext): Promise<VideoDownloadSource>;
  reconcileProcessingStatus?(video: Video): Promise<Video>;
}
