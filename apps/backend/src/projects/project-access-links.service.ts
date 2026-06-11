import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { Repository } from 'typeorm';

import { ProjectAccessLink } from './entities/project-access-link.entity.js';
import { ProjectPermissions, VIEW_ONLY_PROJECT_PERMISSIONS, pickPermissions } from './project-permissions.js';

export type CreateProjectAccessLinkInput = Partial<ProjectPermissions> & {
  label: string;
  projectId: string;
  videoId?: string | null;
  expiresAt?: string | Date | null;
  createdByUserId: number;
};

export type UpdateProjectAccessLinkInput = Partial<ProjectPermissions> & {
  label?: string;
  expiresAt?: string | Date | null;
};

export type ProjectAccessLinkWithToken = {
  link: ProjectAccessLink;
  token: string;
};

@Injectable()
export class ProjectAccessLinksService {
  constructor(
    @InjectRepository(ProjectAccessLink)
    private readonly linksRepository: Repository<ProjectAccessLink>,
  ) {}

  async listForProject(projectId: string): Promise<ProjectAccessLink[]> {
    return this.linksRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: CreateProjectAccessLinkInput): Promise<ProjectAccessLinkWithToken> {
    if (!input.label?.trim()) {
      throw new BadRequestException('Link label is required');
    }

    const token = this.generateToken();
    const permissions = this.safeLinkPermissions(input);
    const link = this.linksRepository.create({
      projectId: input.projectId,
      videoId: input.videoId ?? null,
      label: input.label.trim(),
      tokenHash: this.hashToken(token),
      status: 'active',
      expiresAt: this.parseNullableDate(input.expiresAt),
      lastUsedAt: null,
      createdByUserId: input.createdByUserId,
      revokedByUserId: null,
      revokedAt: null,
      ...permissions,
    });

    return { link: await this.linksRepository.save(link), token };
  }

  async update(projectId: string, linkId: string, input: UpdateProjectAccessLinkInput): Promise<ProjectAccessLink> {
    const link = await this.findProjectLink(projectId, linkId);
    const permissions = this.safeLinkPermissions(input, link);
    Object.assign(link, permissions, {
      label: input.label?.trim() || link.label,
      expiresAt: input.expiresAt !== undefined ? this.parseNullableDate(input.expiresAt) : link.expiresAt,
    });
    return this.linksRepository.save(link);
  }

  async revoke(projectId: string, linkId: string, revokedByUserId: number): Promise<ProjectAccessLink> {
    const link = await this.findProjectLink(projectId, linkId);
    link.status = 'revoked';
    link.revokedByUserId = revokedByUserId;
    link.revokedAt = new Date();
    return this.linksRepository.save(link);
  }

  async rotate(projectId: string, linkId: string): Promise<ProjectAccessLinkWithToken> {
    const link = await this.findProjectLink(projectId, linkId);
    if (link.status !== 'active') {
      throw new BadRequestException('Only active links can be rotated');
    }
    const token = this.generateToken();
    link.tokenHash = this.hashToken(token);
    return { link: await this.linksRepository.save(link), token };
  }

  async resolveToken(token: string): Promise<ProjectAccessLink> {
    const tokenHash = this.hashToken(token);
    const link = await this.linksRepository.findOne({ where: { tokenHash } });
    if (!link || link.status !== 'active' || this.isExpired(link)) {
      throw new ForbiddenException('Magic link is invalid or expired');
    }

    link.lastUsedAt = new Date();
    return this.linksRepository.save(link);
  }

  serialize(link: ProjectAccessLink): Omit<ProjectAccessLink, 'tokenHash'> {
    const { tokenHash, ...safeLink } = link;
    return safeLink;
  }

  toPermissions(link: ProjectAccessLink): ProjectPermissions {
    return pickPermissions(link, VIEW_ONLY_PROJECT_PERMISSIONS);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async findProjectLink(projectId: string, linkId: string): Promise<ProjectAccessLink> {
    const link = await this.linksRepository.findOne({ where: { id: linkId, projectId } });
    if (!link) {
      throw new NotFoundException('Access link not found');
    }
    return link;
  }

  private generateToken(): string {
    return `dl_${randomBytes(32).toString('base64url')}`;
  }

  private safeLinkPermissions(
    input: Partial<ProjectPermissions>,
    fallback: ProjectPermissions = VIEW_ONLY_PROJECT_PERMISSIONS,
  ): ProjectPermissions {
    const permissions = pickPermissions(input, fallback);
    return {
      ...permissions,
      canInviteMembers: false,
      canManageSettings: false,
    };
  }

  private parseNullableDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid expiration date');
    }
    return parsed;
  }

  private isExpired(link: ProjectAccessLink): boolean {
    return !!link.expiresAt && link.expiresAt.getTime() <= Date.now();
  }
}
