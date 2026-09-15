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
import { JobOfferingService } from './job_offering.service';
import { CreateJobOfferingDto } from './dto/create-job_offering.dto';
import { UpdateJobOfferingDto } from './dto/update-job_offering.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('job-offering')
export class JobOfferingController {
  constructor(private readonly jobOfferingService: JobOfferingService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Req() request: IRequestWithPayload,
    @Body() createJobOfferingDto: CreateJobOfferingDto,
  ) {
    return this.jobOfferingService.create(
      createJobOfferingDto,
      request.user.id,
    );
  }

  @Get()
  async findAll(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.jobOfferingService.getListETag();
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.jobOfferingService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.jobOfferingService.getDetailETag(+id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.jobOfferingService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updateJobOfferingDto: UpdateJobOfferingDto,
  ) {
    return this.jobOfferingService.update(
      +id,
      updateJobOfferingDto,
      request.user.id,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.jobOfferingService.remove(+id, request.user.id);
  }
}
