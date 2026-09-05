import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmploymentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  job_title: string;

  @IsNotEmpty()
  @IsDateString()
  start_date: Date;

  @IsNotEmpty()
  @IsOptional()
  @IsDateString()
  end_date?: Date;

  @IsNotEmpty()
  @IsBoolean()
  is_current: boolean;
}
