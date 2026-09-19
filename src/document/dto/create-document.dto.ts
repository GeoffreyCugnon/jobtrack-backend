import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Document_type } from '../../generated/prisma/enums';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsEnum(Document_type)
  type: Document_type;
}
