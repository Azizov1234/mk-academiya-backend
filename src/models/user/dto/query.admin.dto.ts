import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { UserRole } from 'src/core/enums';

export class QueryUserAdminDto {

    @ApiPropertyOptional({ enum: [UserRole.STUDENT, UserRole.TEACHER, UserRole.GLOBAL_USER] })
    @IsOptional()
    @IsString()
    @IsEnum([UserRole.STUDENT, UserRole.TEACHER, UserRole.GLOBAL_USER])
    user?: UserRole.STUDENT | UserRole.TEACHER | UserRole.GLOBAL_USER;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    GroupName?: string;

    @ApiPropertyOptional({ enum: [1, 0] })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        return value === '1' || value === 1 || value === 'true' || value === true;
    })
    @IsBoolean()
    isActive?: boolean

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
