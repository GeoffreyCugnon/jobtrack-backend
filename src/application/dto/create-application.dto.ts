import { IsEnum, IsNotEmpty } from 'class-validator';
import { Application_status } from '../../../prisma/generated/prisma/enums';

export class CreateApplicationDto {
  @IsNotEmpty()
  @IsEnum(Application_status)
  status: Application_status;
}
