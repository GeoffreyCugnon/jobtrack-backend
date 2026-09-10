import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  stats(@Req() request: IRequestWithPayload) {
    return this.dashboardService.statsForUser(request.user.id);
  }
}
