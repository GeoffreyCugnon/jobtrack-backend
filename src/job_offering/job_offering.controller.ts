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
} from '@nestjs/common';
import { JobOfferingService } from './job_offering.service';
import { CreateJobOfferingDto } from './dto/create-job_offering.dto';
import { UpdateJobOfferingDto } from './dto/update-job_offering.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

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
  findAll() {
    return this.jobOfferingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
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
