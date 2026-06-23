import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateAdminDto {
  @ValidateIf(
    (dto: CreateAdminDto) =>
      dto.telegramUserId !== undefined || !dto.telegramUsername,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, {
    message: 'telegramUserId faqat raqamlardan iborat bo\'lishi kerak',
  })
  telegramUserId?: string;

  @ValidateIf(
    (dto: CreateAdminDto) =>
      dto.telegramUsername !== undefined || !dto.telegramUserId,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^@?[A-Za-z0-9_]{5,32}$/, {
    message:
      'telegramUsername 5-32 belgidan iborat bo\'lib, faqat harf/raqam/_ bo\'lishi kerak',
  })
  telegramUsername?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;
}
