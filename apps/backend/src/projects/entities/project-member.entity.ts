import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import type { Project } from './project.entity.js';

export type ProjectMemberRole = 'owner' | 'team_lead' | 'collaborator' | 'client' | 'viewer';
export type ProjectMemberStatus = 'invited' | 'active' | 'disabled';

@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'integer', nullable: true })
  userId: number | null;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text', nullable: true })
  displayName: string | null;

  @Column({ type: 'simple-enum', enum: ['owner', 'team_lead', 'collaborator', 'client', 'viewer'], default: 'viewer' })
  role: ProjectMemberRole;

  @Column({ type: 'simple-enum', enum: ['invited', 'active', 'disabled'], default: 'invited' })
  status: ProjectMemberStatus;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Project', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}
