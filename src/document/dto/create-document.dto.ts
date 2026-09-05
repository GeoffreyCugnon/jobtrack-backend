import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Document_type } from '../../../prisma/generated/prisma/enums';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsEnum(Document_type)
  type: Document_type;

  @IsString()
  @MaxLength(500)
  file_url: string;
}
