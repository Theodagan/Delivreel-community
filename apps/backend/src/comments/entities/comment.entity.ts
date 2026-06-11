import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

@Entity('comments')
@Index(['videoId', 'parentCommentId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  timestamp: number; // Video timestamp in seconds

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'integer', nullable: true })
  resolvedBy: number;

  @Column({ type: 'text' })
  videoId: string;

  @Column({ type: 'text', nullable: true })
  parentCommentId: string;

  @Column({ type: 'integer' })
  authorId: number;

  @Column({ type: 'text', nullable: true })
  authorAccessLinkId: string | null;

  @Column({ type: 'text', nullable: true })
  authorAccessLinkLabel: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Video', 'comments')
  @JoinColumn({ name: 'videoId' })
  video: any;

  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne('Comment', 'replies', { nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: Comment;

  @OneToMany('Comment', 'parentComment')
  replies: Comment[];
}
