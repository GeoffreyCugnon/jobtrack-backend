import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Application_status } from '../../generated/prisma/enums';

export class CreateApplicationDto {
  @IsInt()
  @IsPositive()
  job_offering_id: number;

  // Optionnel : `Application.status` a `@default(PENDING)` en base.
  @IsOptional()
  @IsEnum(Application_status)
  status?: Application_status;
}
