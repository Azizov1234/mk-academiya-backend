import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskAttachmentDto {
  @ApiProperty({
    description: 'Public or internal URL/path of attachment file',
    example: '/uploads/tasks/attachments/essay-template.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({
    description: 'Attachment mime or logical file type',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiPropertyOptional({
    description: 'Optional custom uploader label; current user is used by default',
    example: 'Teacher: John Doe',
  })
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}
