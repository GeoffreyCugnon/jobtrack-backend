import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { InterviewService } from './interview.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('interview')
@UseGuards(AuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get()
  async findAll(
    @Req() request: IRequestWithPayload,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.interviewService.getListETag(request.user.id);
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.interviewService.findAllForUser(request.user.id);
  }

  @Get(':id')
  async findOne(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.interviewService.getDetailETag(
      +id,
      request.user.id,
    );
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.interviewService.findOneForUser(+id, request.user.id);
  }

  @Post()
  create(
    @Req() request: IRequestWithPayload,
    @Body() createInterviewDto: CreateInterviewDto,
  ) {
    return this.interviewService.create(createInterviewDto, request.user.id);
  }

  @Patch(':id')
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(
      +id,
      updateInterviewDto,
      request.user.id,
    );
  }

  @Delete(':id')
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.interviewService.remove(+id, request.user.id);
  }
}
