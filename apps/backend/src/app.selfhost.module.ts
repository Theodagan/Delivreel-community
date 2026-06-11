import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { AuthModule } from './auth/auth.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { Project } from './projects/entities/project.entity.js';
import { ProjectAccessLink } from './projects/entities/project-access-link.entity.js';
import { ProjectMember } from './projects/entities/project-member.entity.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ApplicationSetting } from './settings/entities/application-setting.entity.js';
import { User } from './users/entities/user.entity.js';
import { UsersModule } from './users/users.module.js';
import { Comment } from './comments/entities/comment.entity.js';
import { Video } from './video/core/entities/video.entity.js';
import { VideoGatewayModule } from './video/gateway/video-gateway.module.js';
import { VideoProcessLocalModule } from './video/local/video-process-local.module.js';
import { LocalVideoProcessingService } from './video/local/local-video-processing.service.js';
import { ChatModule } from './chat/chat.module.js';
import { ChatMessage } from './chat/entities/chat-message.entity.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { repairPostgresSchemaBeforeSync } from './database/pre-sync-schema-repair.js';
const __dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const entities = [User, Video, Comment, ChatMessage, Project, ProjectMember, ProjectAccessLink, ApplicationSetting];
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          await repairPostgresSchemaBeforeSync(databaseUrl);

          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: false,
            entities,
            synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
            logging: false,
          };
        }

        return {
          type: 'better-sqlite3',
          database: configService.get('DATABASE_PATH', '/app/database.sqlite'),
          entities,
          synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false, cacheControl: false },
    }),
    AuthModule,
    UsersModule,
    CommentsModule,
    ProjectsModule,
    SettingsModule,
    DashboardModule,
    ChatModule,
    VideoGatewayModule.register([VideoProcessLocalModule], [LocalVideoProcessingService]),
  ],
})
export class AppSelfHostModule {}
