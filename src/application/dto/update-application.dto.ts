import { IsEnum } from 'class-validator';
import { Application_status } from '../../generated/prisma/enums';

export class UpdateApplicationDto {
  @IsEnum(Application_status)
  status: Application_status;
}
