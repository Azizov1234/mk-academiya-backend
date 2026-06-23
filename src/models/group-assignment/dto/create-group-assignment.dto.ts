import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateGroupAssignmentDto {
  @ApiProperty({ description: 'ID of the group' })
  @IsInt()
  groupId: number;

  @ApiPropertyOptional({ description: 'ID of the target student inside the group' })
  @IsInt()
  @IsOptional()
  studentId?: number;

  @ApiPropertyOptional({ description: 'ID of the test (if assignment is a test)' })
  @IsInt()
  @IsOptional()
  testId?: number;

  @ApiPropertyOptional({ description: 'ID of the task (if assignment is a task)' })
  @IsInt()
  @IsOptional()
  taskId?: number;

  @ApiPropertyOptional({ description: 'Due date for the assignment' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Is the assignment required?', default: true })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}
