import { Project } from './entities/project.entity.js';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProjectsRepository extends Repository<Project> {
    constructor(private dataSource: DataSource) {
        super(Project, dataSource.createEntityManager());
    }
  async findVisibleForUser(userId: string, userRole: string, userEmail: string): Promise<Project[]> {
    const qb = this.createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.videos', 'videos')
      .where('project.ownerId = :userId', { userId })
      .orWhere(':userEmail = ANY(project.clientEmails)', { userEmail })
      .andWhere('project.isActive = true')
      .orderBy('project.createdAt', 'DESC');

    return qb.getMany();
  }
}
