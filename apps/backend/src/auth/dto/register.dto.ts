import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

//TODO: add a USER UserRole 
//TODO revoir hiereachie : 
//Un Admin est responsable de plusieurs users et clients, il peut assigner des clients à des projets créés par des users 
//Un User peut créer des projets, upload des vidéos et assigner des clients à des projets et 
//un client peut voir les projets auquel il est associé et poster des commentaires.

export const UserRole = {
  ADMIN: 'admin',
  CLIENT: 'client',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'client', enum: Object.values(UserRole), required: false })
  @IsOptional()
  @IsIn(Object.values(UserRole))
  role?: UserRoleType = UserRole.CLIENT;
}