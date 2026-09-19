import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { Notification } from '../generated/prisma/client';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Req() request: IRequestWithPayload): Promise<Notification[]> {
    return this.notificationService.findAllForUser(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findOneOrThrow(+id);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: IRequestWithPayload,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, request.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: IRequestWithPayload,
  ): Promise<Notification> {
    return this.notificationService.remove(id, request.user.id);
  }
}
