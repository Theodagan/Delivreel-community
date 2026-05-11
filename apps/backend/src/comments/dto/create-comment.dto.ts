import { IsNotEmpty, IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'This section needs to be revised' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 45.5, description: 'Video timestamp in seconds' })
  @IsNumber()
  @Min(0)
  timestamp: number;

  @ApiProperty({ example: 'uuid-of-video' })
  @IsUUID()
  @IsNotEmpty()
  videoId: string;
}