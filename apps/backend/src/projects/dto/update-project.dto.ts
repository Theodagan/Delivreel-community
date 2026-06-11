import { IsOptional, IsString, IsArray, IsEmail, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({ example: 'Updated Project Title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['client1@example.com'],
    description: 'Email addresses of clients who can access this project',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  clientEmails?: string[];

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'User IDs of client viewers granted approval rights',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  approverIds?: string[];
}
