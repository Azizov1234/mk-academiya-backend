import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLeadRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) => String(value ?? '').replace(/\s+/g, ''))
  @IsPhoneNumber('UZ', {
    message: 'Telefon raqami +998901234567 ko\'rinishida bo\'lishi kerak',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseType?: string;
}
