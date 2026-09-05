import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { Notification } from '../../prisma/generated/prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification | null> {
    const targetUser = await this.userService.findOneOrThrow(
      dto.target_user_id,
    );

    if (!targetUser.notifications_enabled) {
      return null; // User has disabled notifications, do not create a notification
    }

    return this.prismaService.notification.create({ data: dto });
  }

  async findAllForUser(userId: number): Promise<Notification[]> {
    return this.prismaService.notification.findMany({
      where: { target_user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneOrThrow(id: number): Promise<Notification> {
    return this.prismaService.notification.findUniqueOrThrow({ where: { id } });
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.findOneOrThrow(id);

    if (notification.target_user_id !== userId) {
      throw new ForbiddenException();
    }

    return this.prismaService.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  update(id: number, _updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
