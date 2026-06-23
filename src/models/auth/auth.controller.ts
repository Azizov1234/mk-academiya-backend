import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone and password' })
  async login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(@Request() req: { user?: { id?: number } }) {
    return {
      success: true,
      message: 'Logged out',
      userId: req.user?.id,
    };
  }
}
