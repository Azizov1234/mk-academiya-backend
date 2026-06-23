import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CefrLevel, UserRole } from 'src/core/enums';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { validateImage } from 'src/common/functions/check.file';
import type { Request } from 'express';

const courseUploadDir = join(process.cwd(), 'uploads', 'courses');
mkdirSync(courseUploadDir, { recursive: true });

const courseImageUploadOptions = {
  storage: diskStorage({
    destination: courseUploadDir,
    filename: (_req, file, cb) => {
      const extension = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image uploads are allowed'), false);
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post('create')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `Create a course (SUPERADMIN, ADMIN)` })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'English Basics' },
        description: { type: 'string', example: 'Beginner course' },
        level: { type: 'string', enum: Object.values(CefrLevel), example: CefrLevel.A1 },
        imageUrl: { type: 'string', format: 'binary' },
        isActive: { type: 'boolean', example: true },
      },
      required: ['title', 'level'],
    },
  })
  @UseInterceptors(
    FileInterceptor('imageUrl', courseImageUploadOptions),
  )
  async createCourse(
    @Body() payload: CreateCourseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      validateImage(file);
      payload.imageUrl = file.filename;
    }
    return this.courseService.createCourse(payload);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `Update a course (SUPERADMIN, ADMIN)` })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: '' },
        description: { type: 'string', example: '' },
        level: { type: 'string', enum: Object.values(CefrLevel) },
        imageUrl: { type: 'string', format: 'binary' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('imageUrl', courseImageUploadOptions),
  )
  async updateCourse(
    @Param('id',ParseIntPipe) id: number,
    @Body() payload: UpdateCourseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      validateImage(file);
      payload.imageUrl = file.filename;
    }
    return this.courseService.updateCourse(id, payload);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: `Delete a course (SUPERADMIN, ADMIN)` })
  async deleteCourse(@Param('id',ParseIntPipe) id: number) {
    return this.courseService.deleteCourseById(id);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all courses (all roles)' })
  async getAllCourses(@Query() query: QueryCourseDto,@Req() req:Request) {
    return this.courseService.getAllCourses(query,req["user"].role);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get one course by ID (all roles)' })
  async getOneCourse(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.getOneCourseById(id);
  }
}
