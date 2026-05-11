import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Video, VideoStatus } from '../entities/video.entity.js';

@Injectable()
export class VideoStateService {
  constructor(
    @InjectRepository(Video)
    private readonly videosRepository: Repository<Video>,
  ) {}

  updateVideoStatus(id: string, status: VideoStatus, hlsPath?: string): Promise<unknown> {
    return this.videosRepository.update(id, {
      status,
      ...(hlsPath && { hlsPath }),
    });
  }
}
