import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Phone number of the user', example: '+998917940303' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ description: 'User password', example: 'mcacademy' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
