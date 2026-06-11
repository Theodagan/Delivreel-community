import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateProjectAccessLinkDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsOptional()
  @IsUUID()
  videoId?: string | null;

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
