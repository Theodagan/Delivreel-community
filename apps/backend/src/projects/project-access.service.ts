import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { Project } from './entities/project.entity.js';
import { FULL_PROJECT_PERMISSIONS, ProjectPermissionKey, ProjectPermissions, VIEW_ONLY_PROJECT_PERMISSIONS, pickPermissions } from './project-permissions.js';

export type ProjectAccessContext = {
  principalType?: 'user' | 'magic_link';
  userId?: number;
  userEmail?: string;
  accessLinkId?: string;
  accessLinkLabel?: string;
  projectId?: string;
  videoId?: string | null;
  permissions?: ProjectPermissions;
};

export type EffectiveProjectAccess = {
  source: 'owner' | 'member' | 'magic_link' | 'anonymous' | 'none';
  permissions: ProjectPermissions;
  member?: ProjectMember;
};

@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['owner', 'videos', 'members'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async resolveAccess(project: Project, context: ProjectAccessContext): Promise<EffectiveProjectAccess> {
    if (context.principalType === 'magic_link') {
      if (context.projectId !== project.id) {
        return { source: 'none', permissions: this.emptyPermissions() };
      }
      return {
        source: 'magic_link',
        permissions: pickPermissions(context.permissions, VIEW_ONLY_PROJECT_PERMISSIONS),
      };
    }

    if (!context.userId) {
      return { source: 'none', permissions: this.emptyPermissions() };
    }

    if (project.ownerId === context.userId) {
      return { source: 'owner', permissions: FULL_PROJECT_PERMISSIONS };
    }

    const userEmail = context.userEmail ?? (await this.getUserEmail(context.userId));
    const member = await this.projectMembersRepository.findOne({
      where: [
        { projectId: project.id, userId: context.userId },
        ...(userEmail ? [{ projectId: project.id, email: userEmail }] : []),
      ],
    });

    if (member && member.status !== 'disabled') {
      return { source: 'member', permissions: pickPermissions(member, VIEW_ONLY_PROJECT_PERMISSIONS), member };
    }

    return { source: 'none', permissions: this.emptyPermissions() };
  }

  async assertPermission(project: Project, context: ProjectAccessContext, permission: ProjectPermissionKey): Promise<EffectiveProjectAccess> {
    const access = await this.resolveAccess(project, context);
    if (!access.permissions[permission]) {
      throw new ForbiddenException('Access denied');
    }
    return access;
  }

  async assertProjectPermission(projectId: string, context: ProjectAccessContext, permission: ProjectPermissionKey): Promise<Project> {
    const project = await this.findProjectOrThrow(projectId);
    await this.assertPermission(project, context, permission);
    return project;
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    return this.projectMembersRepository.find({
      where: { projectId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  serializeCapabilities(access: EffectiveProjectAccess): ProjectPermissions {
    return access.permissions;
  }

  private async getUserEmail(userId: number): Promise<string | undefined> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return user?.email;
  }

  private emptyPermissions(): ProjectPermissions {
    return {
      canView: false,
      canComment: false,
      canResolveComments: false,
      canUploadVideos: false,
      canDownloadVideos: false,
      canApproveVideos: false,
      canSignOffVideos: false,
      canInviteMembers: false,
      canManageSettings: false,
    };
  }
}
