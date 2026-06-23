import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/core/enums';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@ApiTags('user-profiles')
@Controller('user-profiles')
@ApiBearerAuth()
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService, private readonly jwtService: JwtService) {}
  
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}, ${UserRole.STUDENT}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Get("profile/me")
  findMe(@Req() req: Request) {
    return this.userProfileService.findMe(req['user']);
  }
  
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: `${UserRole.SUPERADMIN}, ${UserRole.ADMIN}, ${UserRole.TEACHER}, ${UserRole.STUDENT}` })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Put("profile/update")
  @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          phone: { type: 'string', example:'+998XXXXXXXXX' },
          passwordHash: { type: 'string' },
          fullName: { type: 'string' },
          avatarUrl: { type: 'string', format: 'binary' }
        },
      },
    })
    @UseInterceptors(
      FileInterceptor('avatarUrl', {
        storage: diskStorage({
          destination: './src/uploads',
          filename: (req, file, callback) => {
            const filename = Date.now() + '.' + file.originalname.split('.')[1];
            callback(null, filename);
          },
        }),
      }),
    )
  update(@Body() payload: UpdateUserProfileDto, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    return this.userProfileService.update(payload, req['user'], file?.filename);
  }
}
