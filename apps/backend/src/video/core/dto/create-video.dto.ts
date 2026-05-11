import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ example: 'Product Demo Video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Demonstration of the new product features', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Video file', required: false })
  @IsOptional()
  video?: any;

  @ApiProperty({ example: 'demo.mp4', required: false })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiProperty({ example: 1048576, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiProperty({ example: 'video/mp4', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
