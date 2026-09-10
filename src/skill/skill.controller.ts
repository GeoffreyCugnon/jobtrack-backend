import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { SkillService } from './skill.service';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('skill')
@UseGuards(AuthGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  list(@Req() request: IRequestWithPayload): Promise<string[]> {
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
