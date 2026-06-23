import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AddWordListItemDto {
  @ApiProperty({ description: "Lug'atdagi so'z IDsi", example: 1 })
  @IsInt()
  @IsPositive()
  vocabularyId: number;
}
