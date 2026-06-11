import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../users/entities/user.entity.js';
import { ProjectsModule } from '../../projects/projects.module.js';
import { Video } from './entities/video.entity.js';
import { VideoAccessService } from './services/video-access.service.js';
import { VideoStateService } from './services/video-state.service.js';
import { VideoTelemetryService } from './services/video-telemetry.service.js';
import { EncodingMonitorService } from './services/encoding-monitor.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Video, User]), ProjectsModule],
  providers: [
    VideoAccessService,
    VideoStateService,
    VideoTelemetryService,
    EncodingMonitorService,
  ],
  exports: [
    TypeOrmModule,
    VideoAccessService,
    VideoStateService,
    VideoTelemetryService,
    EncodingMonitorService,
  ],
})
export class VideoCoreModule {}
