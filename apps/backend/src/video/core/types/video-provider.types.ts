import { Video } from '../entities/video.entity.js';
import { CreateVideoDto } from '../dto/create-video.dto.js';

export type UploadResult =
  | { provider: string; video: Video }
  | {
      provider: string;
      video: Video;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      providerUploadId: string;
    };

export type LocalUploadInput = CreateVideoDto;
