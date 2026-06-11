import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';

import { Project } from './entities/project.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsRepository } from './projects.repository.js';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { ProjectMember, ProjectMemberRole } from './entities/project-member.entity.js';
import { CreateProjectMemberDto } from './dto/create-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { UpdateProjectSettingsDto } from './dto/update-project-settings.dto.js';
import { ProjectAccessContext, ProjectAccessService } from './project-access.service.js';
import { ProjectAccessLinksService } from './project-access-links.service.js';
import { defaultPermissionsForRole, pickPermissions } from './project-permissions.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly projectAccessLinksService: ProjectAccessLinksService,
  ) {}

  async create(createProjectDto: CreateProjectDto, ownerId: number): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      ownerId,
    });
    const savedProject = await this.projectsRepository.save(project);
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (owner) {
      await this.upsertMember(savedProject.id, owner.email, 'owner', undefined, owner.name);
    }
    await this.syncClientMembers(savedProject, createProjectDto.clientEmails ?? []);
    return this.findOne(savedProject.id, ownerId);
  }

  async findAll(userId: number, userEmail: string): Promise<Project[]> {
      return this.projectsRepository.findVisibleForUser(userId, userEmail);
  }

  async findOne(id: string, context: ProjectAccessContext | number): Promise<Project> {
    const accessContext = typeof context === 'number' ? { userId: context } : context;
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner', 'videos', 'videos.comments', 'members'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Fetch user email based on userId
    if (accessContext.principalType === 'magic_link' && accessContext.videoId) {
      throw new ForbiddenException('Magic link is limited to a video');
    }
    const user = accessContext.userId ? await this.usersRepository.findOne({ where: { id: accessContext.userId } }) : null;
    const userEmail = user?.email;

    await this.projectAccessService.assertPermission(project, { ...accessContext, userEmail }, 'canView');

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, context: ProjectAccessContext | number): Promise<Project> {
    const accessContext = this.normalizeAccessContext(context);
    const project = await this.findOne(id, accessContext);
    await this.projectAccessService.assertPermission(project, accessContext, 'canManageSettings');

    if (updateProjectDto.approverIds !== undefined) {
      await this.validateApproverIds(updateProjectDto.approverIds, project);
    }

    Object.assign(project, updateProjectDto);
    const savedProject = await this.projectsRepository.save(project);
    if (updateProjectDto.clientEmails) {
      await this.syncClientMembers(savedProject, updateProjectDto.clientEmails);
    }
    return savedProject;
  }

  private async validateApproverIds(approverIds: string[], project: Project): Promise<void> {
    const clientEmails = project.clientEmails ?? [];

    for (const approverIdStr of approverIds) {
      const approverId = Number(approverIdStr);
      const user = await this.usersRepository.findOne({ where: { id: approverId } });
      if (!user) {
        throw new BadRequestException(`Approver not found: ${approverIdStr}`);
      }
      if (!user.isActive) {
        throw new BadRequestException(`Approver is inactive: ${approverIdStr}`);
      }
      if (!clientEmails.includes(user.email)) {
        throw new BadRequestException('Approver must have project access');
      }
    }
  }

  async findEligibleApprovers(id: string, context: ProjectAccessContext | number): Promise<Pick<User, 'id' | 'name' | 'email' | 'isActive'>[]> {
    const accessContext = this.normalizeAccessContext(context);
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.projectAccessService.assertPermission(project, accessContext, 'canManageSettings');

    const clientEmails = project.clientEmails ?? [];
    if (clientEmails.length === 0) {
      return [];
    }

    return this.usersRepository.find({
      where: { email: In(clientEmails), isActive: true },
      select: ['id', 'name', 'email', 'isActive'],
    });
  }

  async remove(id: string, context: ProjectAccessContext | number): Promise<void> {
    const accessContext = this.normalizeAccessContext(context);
    const project = await this.findOne(id, accessContext);
    await this.projectAccessService.assertPermission(project, accessContext, 'canManageSettings');

    await this.projectsRepository.remove(project);
  }

  async archive(id: string, context: ProjectAccessContext | number): Promise<Project> {
    const accessContext = this.normalizeAccessContext(context);
    const project = await this.findOne(id, accessContext);
    await this.projectAccessService.assertPermission(project, accessContext, 'canManageSettings');
    if (project.archivedAt) throw new BadRequestException('Project already archived');
    project.archivedAt = new Date();
    project.archivedBy = accessContext.userId!;
    return this.projectsRepository.save(project);
  }

  async restore(id: string, context: ProjectAccessContext | number): Promise<Project> {
    const accessContext = this.normalizeAccessContext(context);
    const project = await this.projectsRepository.findOne({ where: { id }, relations: ['owner'] });
    if (!project) throw new NotFoundException('Project not found');
    await this.projectAccessService.assertPermission(project, accessContext, 'canManageSettings');
    if (!project.archivedAt) throw new BadRequestException('Project is not archived');
    project.archivedAt = null as any;
    project.archivedBy = null as any;
    return this.projectsRepository.save(project);
  }

  async getSettings(id: string, context: ProjectAccessContext) {
    const project = await this.projectAccessService.findProjectOrThrow(id);
    const access = await this.projectAccessService.assertPermission(project, context, 'canView');
    const members = await this.projectAccessService.listMembers(id);
    const accessLinks = await this.projectAccessLinksService.listForProject(id);

    return {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        ownerId: project.ownerId,
        owner: project.owner,
        clientEmails: project.clientEmails ?? [],
        videos: project.videos ?? [],
        approverIds: project.approverIds ?? [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      capabilities: this.projectAccessService.serializeCapabilities(access),
      accessSource: access.source,
      members,
      accessLinks: accessLinks.map((link) => this.projectAccessLinksService.serialize(link)),
      videos: (project.videos ?? []).map((video) => ({
        id: video.id,
        title: video.title,
        status: video.status,
        downloadEnabled: !!video.downloadEnabled,
        downloadSupported: video.status === 'ready' && !!video.filepath,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      })),
      metadata: {
        videoCount: project.videos?.length ?? 0,
        memberCount: members.length,
      },
      payment: null,
    };
  }

  async updateSettings(id: string, dto: UpdateProjectSettingsDto, context: ProjectAccessContext) {
    const project = await this.projectAccessService.assertProjectPermission(id, context, 'canManageSettings');
    return this.getSettings(id, context);
  }

  async addMember(projectId: string, dto: CreateProjectMemberDto, context: ProjectAccessContext): Promise<ProjectMember> {
    await this.projectAccessService.assertProjectPermission(projectId, context, 'canInviteMembers');
    const role = dto.role ?? 'viewer';
    return this.upsertMember(projectId, dto.email, role, dto, dto.displayName);
  }

  async updateMember(projectId: string, memberId: string, dto: UpdateProjectMemberDto, context: ProjectAccessContext): Promise<ProjectMember> {
    await this.projectAccessService.assertProjectPermission(projectId, context, 'canManageSettings');
    const member = await this.projectMembersRepository.findOne({ where: { id: memberId, projectId } });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }
    const role = dto.role ?? member.role;
    const permissions = pickPermissions(dto, dto.role ? defaultPermissionsForRole(role) : pickPermissions(member, defaultPermissionsForRole(role)));
    Object.assign(member, permissions, {
      role,
      status: dto.status ?? member.status,
      displayName: dto.displayName ?? member.displayName,
    });
    await this.assertProjectKeepsAdmin(projectId, member);
    return this.projectMembersRepository.save(member);
  }

  async removeMember(projectId: string, memberId: string, context: ProjectAccessContext): Promise<void> {
    await this.projectAccessService.assertProjectPermission(projectId, context, 'canManageSettings');
    const member = await this.projectMembersRepository.findOne({ where: { id: memberId, projectId } });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }
    await this.assertProjectKeepsAdmin(projectId, undefined, member.id);
    await this.projectMembersRepository.remove(member);
  }

  private async syncClientMembers(project: Project, clientEmails: string[]): Promise<void> {
    for (const email of clientEmails) {
      await this.upsertMember(project.id, email, 'client');
    }
  }

  private async upsertMember(
    projectId: string,
    email: string,
    role: ProjectMemberRole,
    permissionOverrides?: Partial<ProjectMember>,
    displayName?: string,
  ): Promise<ProjectMember> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({ where: { email: normalizedEmail } });
    const existing = await this.projectMembersRepository.findOne({ where: { projectId, email: normalizedEmail } });
    const permissions = pickPermissions(permissionOverrides, defaultPermissionsForRole(role));
    const member = this.projectMembersRepository.create({
      ...(existing ?? {}),
      projectId,
      userId: user?.id ?? existing?.userId ?? null,
      email: normalizedEmail,
      displayName: displayName ?? existing?.displayName ?? user?.name ?? null,
      role,
      status: user ? 'active' : existing?.status ?? 'invited',
      ...permissions,
    });
    return this.projectMembersRepository.save(member);
  }

  private async assertProjectKeepsAdmin(
    projectId: string,
    changedMember?: ProjectMember,
    removedMemberId?: string,
  ): Promise<void> {
    const members = await this.projectMembersRepository.find({ where: { projectId } });
    const hasEffectiveAdmin = members.some((member) => {
      if (removedMemberId && member.id === removedMemberId) {
        return false;
      }
      const candidate = changedMember?.id === member.id ? changedMember : member;
      return candidate.status !== 'disabled' && candidate.canManageSettings;
    });

    if (!hasEffectiveAdmin) {
      throw new BadRequestException('Project must keep at least one active admin');
    }
  }

  private normalizeAccessContext(context: ProjectAccessContext | number): ProjectAccessContext {
    return typeof context === 'number' ? { userId: context } : context;
  }
}
