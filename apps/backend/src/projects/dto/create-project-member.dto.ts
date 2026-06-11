import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

import { ProjectPermissionsDto } from './project-permissions.dto.js';
import { ProjectMemberRole } from '../entities/project-member.entity.js';

export class CreateProjectMemberDto extends ProjectPermissionsDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsIn(['owner', 'team_lead', 'collaborator', 'client', 'viewer'])
  role?: ProjectMemberRole;
}
