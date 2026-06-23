import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole, CefrLevel } from '../../../core/enums';

export class CreateUserDto {
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

  @ApiPropertyOptional({ enum: CefrLevel, example: CefrLevel.B2 })
  @IsOptional()
  @IsEnum(CefrLevel)
  cefrLevel?: CefrLevel;
}
