import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, IsEmail } from 'class-validator';

export class CreateUserProfileDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Plain text password (hashed on server)' })
  @IsString()
  passwordHash: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string; 

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;
}
