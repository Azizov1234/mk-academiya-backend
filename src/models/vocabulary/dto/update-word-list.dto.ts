import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWordListDto {
  @ApiPropertyOptional({ description: "Yangi nom", example: 'Advanced IELTS Vocabulary' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Ommaviy/yopiq holat", example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
