import { IsIn, IsOptional, IsString } from 'class-validator';

import { ProjectPermissionsDto } from './project-permissions.dto.js';
import { ProjectMemberRole, ProjectMemberStatus } from '../entities/project-member.entity.js';

export class UpdateProjectMemberDto extends ProjectPermissionsDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsIn(['owner', 'team_lead', 'collaborator', 'client', 'viewer'])
  role?: ProjectMemberRole;

  @IsOptional()
  @IsIn(['invited', 'active', 'disabled'])
  status?: ProjectMemberStatus;
}
