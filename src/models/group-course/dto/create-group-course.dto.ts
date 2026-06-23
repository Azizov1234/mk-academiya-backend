import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateGroupCourseDto {
  @ApiProperty({ example: 1, description: 'Guruh ID si' })
  @IsInt()
  @Min(1)
  groupId!: number;

  @ApiProperty({ example: 2, description: 'Kurs ID si' })
  @IsInt()
  @Min(1)
  courseId!: number;
}