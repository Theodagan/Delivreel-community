import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { Project } from './entities/project.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsRepository } from './projects.repository.js';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private hasAccess(project: Project, userId: string, userRole: string, userEmail?: string): boolean {
  return (
    userRole === 'admin' ||
    project.ownerId === userId ||
    //project.isPublic ||
    (project.clientEmails?.includes(userEmail) ?? false)
  );
}

  async create(createProjectDto: CreateProjectDto, ownerId: string): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      ownerId,
    });
    return this.projectsRepository.save(project);
  }

  async findAll(userId: string, userRole: string, userEmail: string): Promise<Project[]> {
      return this.projectsRepository.findVisibleForUser(userId, userRole, userEmail);
  }

  async findOne(id: string, userId: string, userRole: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner', 'videos', 'videos.comments'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Fetch user email based on userId
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const userEmail = user?.email;

    // Check access permissions
    if (!this.hasAccess(project, userId, userRole, userEmail)) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string, userRole: string): Promise<Project> {
    const project = await this.findOne(id, userId, userRole);
    
    // Only admin or owner can update
    if (userRole !== 'admin' && project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const project = await this.findOne(id, userId, userRole);
    
    // Only admin or owner can delete
    if (userRole !== 'admin' && project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.projectsRepository.remove(project);
  }
}