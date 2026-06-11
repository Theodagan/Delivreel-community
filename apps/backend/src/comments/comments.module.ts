import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { CommentsGateway } from './comments.gateway.js';
import { Comment } from './entities/comment.entity.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { Video } from '../video/core/entities/video.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Video]), ProjectsModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsGateway],
  exports: [CommentsService],
})
export class CommentsModule {}
