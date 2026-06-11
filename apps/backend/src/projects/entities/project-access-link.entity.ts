import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { Project } from './project.entity.js';
import type { User } from '../../users/entities/user.entity.js';

export type ProjectAccessLinkStatus = 'active' | 'revoked';

@Entity('project_access_links')
export class ProjectAccessLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  videoId: string | null;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'text', unique: true })
  tokenHash: string;

  @Column({ type: 'simple-enum', enum: ['active', 'revoked'], default: 'active' })
  status: ProjectAccessLinkStatus;

  @Column({ type: 'boolean', default: true })
  canView: boolean;

  @Column({ type: 'boolean', default: false })
  canComment: boolean;

  @Column({ type: 'boolean', default: false })
  canResolveComments: boolean;

  @Column({ type: 'boolean', default: false })
  canUploadVideos: boolean;

  @Column({ type: 'boolean', default: false })
  canDownloadVideos: boolean;

  @Column({ type: 'boolean', default: false })
  canApproveVideos: boolean;

  @Column({ type: 'boolean', default: false })
  canSignOffVideos: boolean;

  @Column({ type: 'boolean', default: false })
  canInviteMembers: boolean;

  @Column({ type: 'boolean', default: false })
  canManageSettings: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'integer' })
  createdByUserId: number;

  @Column({ type: 'integer', nullable: true })
  revokedByUserId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;
}
