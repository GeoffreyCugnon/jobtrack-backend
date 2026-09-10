import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Interview_interview_type } from '../../../prisma/generated/prisma/enums';

export class CreateInterviewDto {
  @IsInt()
  @IsPositive()
  application_id: number;

  @IsEnum(Interview_interview_type)
  interview_type: Interview_interview_type;

  @IsDateString()
  scheduled_at: string;

  // Lien de visio (type VISIO) ou adresse (type PRESENTIEL), selon le type.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
