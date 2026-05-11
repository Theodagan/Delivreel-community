import { IsNotEmpty, IsString, IsOptional, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Product Launch Video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Video content for the new product launch campaign', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: ['client1@example.com', 'client2@example.com'],
    description: 'Email addresses of clients who can access this project',
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  clientEmails?: string[];
}