import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { Publication_type } from '../../../prisma/generated/prisma/enums';

export class CreatePublicationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  content: string;

  @IsNotEmpty()
  @IsEnum(Publication_type)
  type: Publication_type;

  @IsNotEmpty()
  @IsBoolean()
  is_public: boolean;

  @IsNumber()
  likes_count: number;
}
