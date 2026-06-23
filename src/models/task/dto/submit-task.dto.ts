import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({
    description: 'Submission text or uploaded file URL.',
    example: 'https://cdn.example.com/submissions/essay-1.pdf',
  })
  @ValidateIf((obj: SubmitTaskDto) => !obj.submissionUrl)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  submissionContent?: string;

  @ApiPropertyOptional({
    description: 'Backward-compatible alias for submissionContent.',
    example: 'https://cdn.example.com/submissions/essay-1.pdf',
    deprecated: true,
  })
  @ValidateIf((obj: SubmitTaskDto) => !obj.submissionContent)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  submissionUrl?: string;
}
