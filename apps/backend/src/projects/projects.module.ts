import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { MagicLinksController } from './magic-links.controller.js';
import { Project } from './entities/project.entity.js';
import { ProjectAccessLink } from './entities/project-access-link.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectAccessLinksService } from './project-access-links.service.js';
import { ProjectsRepository } from './projects.repository.js';
import { AccessAuthGuard } from '../auth/guards/access-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, ProjectAccessLink, User]),
    UsersModule,
  ],
  controllers: [ProjectsController, MagicLinksController],
  providers: [ProjectsService, ProjectsRepository, ProjectAccessService, ProjectAccessLinksService, AccessAuthGuard],
  exports: [ProjectsService, ProjectAccessService, ProjectAccessLinksService, AccessAuthGuard, TypeOrmModule],
})
export class ProjectsModule {}
