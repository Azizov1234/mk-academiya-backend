import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCenterInfoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  aboutText!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  address!: string;

  @IsPhoneNumber('UZ', {
    message: 'phone1 +998901234567 formatida bo\'lishi kerak',
  })
  phone1!: string;

  @IsOptional()
  @IsPhoneNumber('UZ', {
    message: 'phone2 +998901234567 formatida bo\'lishi kerak',
  })
  phone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramUsername?: string;
}
