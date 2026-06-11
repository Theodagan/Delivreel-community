import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVideoSettingsDto {
  @IsOptional()
  @IsBoolean()
  downloadEnabled?: boolean;
}
