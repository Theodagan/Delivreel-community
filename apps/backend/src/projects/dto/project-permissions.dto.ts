import { IsBoolean, IsOptional } from 'class-validator';

export class ProjectPermissionsDto {
  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canComment?: boolean;

  @IsOptional()
  @IsBoolean()
  canResolveComments?: boolean;

  @IsOptional()
  @IsBoolean()
  canUploadVideos?: boolean;

  @IsOptional()
  @IsBoolean()
  canDownloadVideos?: boolean;

  @IsOptional()
  @IsBoolean()
  canApproveVideos?: boolean;

  @IsOptional()
  @IsBoolean()
  canSignOffVideos?: boolean;

  @IsOptional()
  @IsBoolean()
  canInviteMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageSettings?: boolean;
}
