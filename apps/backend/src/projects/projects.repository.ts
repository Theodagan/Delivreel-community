import { Project } from './entities/project.entity.js';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProjectsRepository extends Repository<Project> {
    constructor(private dataSource: DataSource) {
        super(Project, dataSource.createEntityManager());
    }
  async findVisibleForUser(userId: number, userEmail: string): Promise<Project[]> {
    const projects = await this.find({
      where: { isActive: true },
      relations: ['owner', 'videos', 'members'],
      order: { createdAt: 'DESC' },
    });

    return projects.filter((project) =>
      project.ownerId === userId ||
      project.members?.some((member) =>
        member.status !== 'disabled' && (member.userId === userId || member.email === userEmail)
      ) ||
      project.clientEmails?.includes(userEmail)
    );
  }
}
