import { BadRequestException, Injectable } from '@nestjs/common';

import { Video } from '../entities/video.entity.js';
import { VideoProvider } from './video-provider.interface.js';

@Injectable()
export class VideoProviderRegistry {
  constructor(private readonly providers: VideoProvider[]) {}

  getUploadProvider(): VideoProvider {
    const provider = this.providers[0];
    if (!provider) {
      throw new BadRequestException('No video provider is configured');
    }
    return provider;
  }

  async getPlaybackProvider(video: Video): Promise<VideoProvider> {
    for (const provider of this.providers) {
      if (await provider.supportsPlayback(video)) {
        return provider;
      }
    }
    throw new BadRequestException('Playback provider not available');
  }
}
