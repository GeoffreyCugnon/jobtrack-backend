import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkillService } from './skill.service';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@Controller('skill')
@UseGuards(AuthGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  async list(
    @Req() request: IRequestWithPayload,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string[] | undefined> {
    const etag = await this.skillService.getListETag(request.user.id);
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.skillService.listForUser(request.user.id);
  }

  @Put()
  replace(
    @Req() request: IRequestWithPayload,
    @Body() dto: UpdateSkillsDto,
  ): Promise<string[]> {
    return this.skillService.replaceForUser(request.user.id, dto.skills);
  }
}
