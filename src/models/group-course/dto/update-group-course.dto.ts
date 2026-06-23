import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateGroupCourseDto {
  @ApiPropertyOptional({ example: 1, description: 'Yangi guruh ID si' })
  @IsOptional()
  @IsInt()
  @Min(1)
  groupId?: number;

  @ApiPropertyOptional({ example: 2, description: 'Yangi kurs ID si' })
  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @ApiPropertyOptional({ example: true, description: 'Faollik holati' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}