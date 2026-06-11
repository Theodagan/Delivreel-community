import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProjectAccessLinkDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

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
}
