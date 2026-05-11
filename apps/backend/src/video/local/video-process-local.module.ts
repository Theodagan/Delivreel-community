import { Module } from '@nestjs/common';

import { VideoCoreModule } from '../core/video-core.module.js';
import { LocalVideoProcessingService } from './local-video-processing.service.js';
import { StreamController } from './stream.controller.js';
import { TranscodeService } from './transcode.service.js';

@Module({
  imports: [VideoCoreModule],
  controllers: [StreamController],
  providers: [LocalVideoProcessingService, TranscodeService],
  exports: [LocalVideoProcessingService],
})
export class VideoProcessLocalModule {}
