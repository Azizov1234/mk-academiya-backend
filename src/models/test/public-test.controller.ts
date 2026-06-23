import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PublicExamCatalogQueryDto,
  PublicExamRatingQueryDto,
  SubmitPublicExamDto,
} from './dto';
import { PublicTestService } from './public-test.service';

@ApiTags('public-exams')
@Controller('public-exams')
export class PublicTestController {
  constructor(private readonly publicTestService: PublicTestService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List all public exam tests (open for everyone)' })
  listCatalog(@Query() query: PublicExamCatalogQueryDto) {
    return this.publicTestService.listCatalog(query);
  }

  @Get('ratings')
  @ApiOperation({ summary: 'Global public exam rating list' })
  getRatings(@Query() query: PublicExamRatingQueryDto) {
    return this.publicTestService.getRatings(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public exam test by ID' })
  getTest(@Param('id', ParseIntPipe) id: number) {
    return this.publicTestService.getPublicTestById(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit public exam answers and get level result' })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitPublicExamDto,
  ) {
    return this.publicTestService.submitPublicAttempt(id, dto);
  }
}
