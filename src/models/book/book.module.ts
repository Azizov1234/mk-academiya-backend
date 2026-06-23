import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { PrismaModule } from 'src/core/config/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
