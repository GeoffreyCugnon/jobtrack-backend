import { IsInt, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { Notification_event_type } from '../../../prisma/generated/prisma/enums';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsInt()
  target_user_id: number;

  @IsNotEmpty()
  @IsInt()
  trigger_id: number;

  @IsOptional()
  @IsInt()
  source_id?: number;

  @IsNotEmpty()
  @IsEnum(Notification_event_type)
  event_type: Notification_event_type;
}
