import { IsEnum, IsNotEmpty } from 'class-validator';
import { Connection_status } from '../../../prisma/generated/prisma/enums';

export class CreateConnectionDto {
  @IsNotEmpty()
  @IsEnum(Connection_status)
  status: Connection_status;
}
