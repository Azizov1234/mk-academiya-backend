import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ description: 'Full name of the student', example: 'Ali Valiyev' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Phone number of the student', example: '+998901234567' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Message or specific request', example: 'I want to study IELTS Foundation', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ description: 'New status of the lead', enum: ['NEW', 'CONTACTED', 'ENROLLED', 'REJECTED'] })
  @IsString()
  status: string;
}

export class UpdateLeadAnswerDto {
  @ApiProperty({
    description: 'Admin answer for the course question',
    example: "Ha, beginner guruhlarimiz haftada 3 marta o'tiladi.",
  })
  @IsNotEmpty()
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'Show this answered question on landing page',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
