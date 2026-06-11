import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '../comments/entities/comment.entity.js';
import { Video } from '../video/core/entities/video.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Video, Project])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
