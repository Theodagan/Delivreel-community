import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../comments/entities/comment.entity.js';
import { Video } from '../video/core/entities/video.entity.js';
import { Project } from '../projects/entities/project.entity.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepo: Repository<Comment>,
    @InjectRepository(Video)
    private readonly videosRepo: Repository<Video>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  async getActivity(userId: number, limit = 10): Promise<any[]> {
    limit = Math.min(limit, 50);
    const comments = await this.commentsRepo.find({
      relations: ['author', 'video', 'video.project', 'video.project.members'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return comments
      .filter(c => this.isVisibleToUser(c, userId))
      .slice(0, limit)
      .map(c => ({
        kind: c.parentCommentId ? 'reply' : (c.resolved ? 'resolve' : 'comment'),
        commentId: c.id,
        text: c.text,
        author: c.author?.name,
        videoTitle: c.video?.title,
        projectId: c.video?.projectId,
        timestamp: c.createdAt,
      }));
  }

  async getFeedback(userId: number, limit = 10): Promise<any[]> {
    limit = Math.min(limit, 50);
    const comments = await this.commentsRepo.find({
      where: { resolved: false, parentCommentId: null as any },
      relations: ['author', 'video', 'video.project', 'video.project.members'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return comments
      .filter(c => this.isVisibleToUser(c, userId))
      .slice(0, limit)
      .map(c => ({
        commentId: c.id,
        text: c.text,
        author: c.author?.name,
        videoTitle: c.video?.title,
        projectId: c.video?.projectId,
        timestamp: c.createdAt,
      }));
  }

  async getTotalBytes(): Promise<number> {
    const r = await this.videosRepo
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.size), 0)', 'total')
      .getRawOne();
    return Number(r.total);
  }

  async getSummary(): Promise<any> {
    const totalProjects = await this.projectsRepo.count();
    const totalVideos = await this.videosRepo.count();
    const totalComments = await this.commentsRepo.count();
    const resolvedCount = await this.commentsRepo.count({ where: { resolved: true } });
    const approvedCount = await this.videosRepo.createQueryBuilder('v')
      .where('v.approvedAt IS NOT NULL').getCount();

    const totalBytes = await this.videosRepo
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.size), 0)', 'total')
      .getRawOne()
      .then(r => Number(r.total));

    return {
      totalProjects,
      totalVideos,
      totalComments,
      percentResolved: totalComments > 0 ? Math.round((resolvedCount / totalComments) * 100) : 0,
      percentApproved: totalVideos > 0 ? Math.round((approvedCount / totalVideos) * 100) : 0,
      totalBytes,
    };
  }

  private isVisibleToUser(comment: Comment, userId: number): boolean {
    const project = comment.video?.project;
    return !!project && (
      project.ownerId === userId ||
      project.members?.some((member) => member.status !== 'disabled' && member.userId === userId)
    );
  }
}
