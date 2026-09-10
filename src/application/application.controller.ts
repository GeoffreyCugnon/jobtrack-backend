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
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('application')
@UseGuards(AuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  findAll(@Req() request: IRequestWithPayload) {
    return this.applicationService.findAllForUser(request.user.id);
  }

  @Get(':id')
  findOne(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.applicationService.findOneForUser(+id, request.user.id);
  }

  @Post()
  create(
    @Req() request: IRequestWithPayload,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    return this.applicationService.create(
      createApplicationDto,
      request.user.id,
    );
  }

  @Patch(':id')
  update(
    @Req() request: IRequestWithPayload,
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationService.update(
      +id,
      updateApplicationDto,
      request.user.id,
    );
  }

  @Delete(':id')
  remove(@Req() request: IRequestWithPayload, @Param('id') id: string) {
    return this.applicationService.remove(+id, request.user.id);
  }
}
