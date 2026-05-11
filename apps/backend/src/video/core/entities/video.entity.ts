import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

import { Project } from '../../../projects/entities/project.entity.js';

export type VideoStatus = 'processing' | 'ready' | 'failed';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  originalFilename: string;

  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column({ nullable: true })
  hlsPath: string;

  @Column()
  size: number;

  @Column()
  mimeType: string;

  @Column({
    type: 'simple-enum',
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
  })
  status: VideoStatus;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column()
  projectId: string;

  @Column()
  uploadedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Project, (project) => project.videos)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany('Comment', 'video')
  comments: any[];
}
