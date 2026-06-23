import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'src/core/config/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('token not found');
    }

    try {
      const data = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      
      const user = await this.prisma.user.findUnique({ 
        where: { id: data.id }
      });

      if (!user) {
        throw new UnauthorizedException('user not found');
      }

      request['user'] = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('invalid token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const rawAuthHeader = request.headers?.authorization;
    if (!rawAuthHeader) {
      return null;
    }

    const [scheme, token] = rawAuthHeader.split(' ');
    if (!scheme || !token) {
      return null;
    }

    if (scheme.toLowerCase() !== 'bearer') {
      return null;
    }

    return token;
  }
}
