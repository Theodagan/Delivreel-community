import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateApplicationSettingsDto {
  @IsOptional()
  @IsIn(['compact', 'comfortable', 'large'])
  timelineMarkerSize?: 'compact' | 'comfortable' | 'large';

  @IsOptional()
  @IsIn(['all', 'open', 'resolved'])
  defaultCommentFilter?: 'all' | 'open' | 'resolved';

  @IsOptional()
  @IsBoolean()
  autoplayOnLoad?: boolean;

  @IsOptional()
  @IsBoolean()
  showProviderBadge?: boolean;
}
