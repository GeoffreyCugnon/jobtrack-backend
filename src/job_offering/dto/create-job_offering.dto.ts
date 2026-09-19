import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Job_offering_contract_type } from '../../generated/prisma/enums';

export class CreateJobOfferingDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(Job_offering_contract_type)
  contract_type: Job_offering_contract_type;
}
