import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum, IsNotEmpty } from 'class-validator';
import { CefrLevel } from '../../../core/enums';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Elementary English (A1)' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: CefrLevel, description: 'CEFR level (A1-C2)' })
  @IsEnum(CefrLevel)
  level!: CefrLevel;

  @ApiPropertyOptional()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @Type(()=>Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
