import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

import { VideoStateService } from '../core/services/video-state.service.js';

@Injectable()
export class TranscodeService {
  constructor(private readonly videoStateService: VideoStateService) {}

  async transcodeVideo(videoId: string, inputPath: string): Promise<void> {
    const outputDir = join(process.cwd(), 'hls', videoId);
    const outputPath = join(outputDir, 'manifest.m3u8');

    try {
      if (existsSync(outputDir)) {
        await rm(outputDir, { recursive: true, force: true });
      }
      await mkdir(outputDir, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls',
          ])
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('Spawned FFmpeg with command: ' + commandLine);
          })
          .on('progress', (progress) => {
            console.log('Processing: ' + progress.percent + '% done');
          })
          .on('end', () => {
            console.log('Transcoding completed for video:', videoId);
            resolve();
          })
          .on('error', (err) => {
            console.error('Transcoding error:', err);
            reject(err);
          })
          .run();
      });

      await this.videoStateService.updateVideoStatus(videoId, 'ready', outputPath);
    } catch (error) {
      console.error('Transcoding failed:', error);
      await this.videoStateService.updateVideoStatus(videoId, 'failed');
      throw error;
    }
  }
}
