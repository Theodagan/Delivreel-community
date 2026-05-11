import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCommentDto } from './create-comment.dto.js';

export class UpdateCommentDto extends PartialType(
  OmitType(CreateCommentDto, ['videoId'] as const)
) {}