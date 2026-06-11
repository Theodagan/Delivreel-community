import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';

import type { User } from '../../users/entities/user.entity.js';
import type { ProjectMember } from './project-member.entity.js';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: [] })
  clientEmails: string[];

  @Column({ type: 'integer' })
  ownerId: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('User', 'projects')
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany('Video', 'project')
  videos: any[];

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'integer', nullable: true })
  archivedBy: number;

  @Column({ type: 'text', array: true, default: [] })
  approverIds: string[];

  @OneToMany('ProjectMember', 'project')
  members: ProjectMember[];

}
