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
import { InterviewService } from './interview.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('interview')
@UseGuards(AuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get()
  findAll(@Req() request: IRequestWithPayload) {
    return this.interviewService.findAllForUser(request.user.id);
  }

  @Get(':id')
  findOne(@Req() request: IRequestWithPayload, @Param('id') id: string) {
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
