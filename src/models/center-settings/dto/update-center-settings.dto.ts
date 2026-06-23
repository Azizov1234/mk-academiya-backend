import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateCenterSettingsDto {
  @ApiPropertyOptional({ example: 'MK Academy' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'MK' })
  @IsString()
  @IsOptional()
  shortName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  // Landing content fields
  @ApiPropertyOptional({ description: 'About section text' })
  @IsString()
  @IsOptional()
  aboutText?: string;

  @ApiPropertyOptional({ description: 'JSON string: string[]' })
  @IsString()
  @IsOptional()
  aboutPoints?: string;

  @ApiPropertyOptional({ description: 'JSON string: [{name,role,image,focus}]' })
  @IsString()
  @IsOptional()
  teamMembers?: string;

  @ApiPropertyOptional({ description: 'JSON string: [{title,level,desc}]' })
  @IsString()
  @IsOptional()
  courseTracks?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workingHours?: string;

  @ApiPropertyOptional({ description: 'JSON string: {telegram?,instagram?,youtube?}' })
  @IsString()
  @IsOptional()
  socialLinks?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mapEmbedUrl?: string;
}
