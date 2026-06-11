import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Project } from '../../projects/entities/project.entity.js';
import { ProjectsModule } from '../../projects/projects.module.js';
import { User } from '../../users/entities/user.entity.js';
import { SettingsModule } from '../../settings/settings.module.js';
import { UploadAccessModule } from '../../upload-access/upload-access.module.js';
import { VideoCoreModule } from '../core/video-core.module.js';
import { VideoProviderRegistry } from '../core/providers/video-provider.registry.js';
import { PlaybackController } from './playback.controller.js';
import { VideoGatewayService } from './video-gateway.service.js';
import { VideosController } from './videos.controller.js';

const baseImports = [
    VideoCoreModule,
    SettingsModule,
    UploadAccessModule,
    TypeOrmModule.forFeature([Project, User]),
    ProjectsModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('video/')) {
          callback(null, true);
        } else {
          callback(new Error('Only video files are allowed'), false);
        }
      },
      limits: {
        fileSize: 500 * 1024 * 1024,
      },
    }),
];

@Module({
  imports: baseImports,
  controllers: [VideosController, PlaybackController],
  providers: [VideoGatewayService],
  exports: [VideoGatewayService],
})
export class VideoGatewayModule {
  static register(providerImports: any[], providerTokens: any[], extraProviders: Provider[] = []): DynamicModule {
    return {
      module: VideoGatewayModule,
      imports: [...baseImports, ...providerImports],
      controllers: [VideosController, PlaybackController],
      providers: [
        VideoGatewayService,
        {
          provide: VideoProviderRegistry,
          useFactory: (...providers) => new VideoProviderRegistry(providers),
          inject: providerTokens,
        },
        ...extraProviders,
      ],
      exports: [VideoGatewayService],
    };
  }
}
