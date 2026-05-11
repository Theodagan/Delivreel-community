import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVideoDto } from './create-video.dto.js';

export class UpdateVideoDto extends PartialType(
  OmitType(CreateVideoDto, ['video', 'projectId', 'originalFilename', 'size', 'mimeType'] as const)
) {}
