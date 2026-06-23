import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateWordListDto {
  @ApiProperty({ description: "O'quvchi ID si (Kimgadir biriktiriladi)", example: 1 })
  @IsInt()
  @IsPositive()
  studentId: number;

  @ApiProperty({ description: "So'z ro'yxatining nomi", example: 'Intermediate Vocabulary' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: "Ro'yxat ommaviy ko'rinadimi? (boshqa studentlar ko'ra oladi)",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
