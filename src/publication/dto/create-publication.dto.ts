import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Publication_type } from '../../generated/prisma/enums';

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

  // Optionnel : image jointe au post (data URL générée côté client via
  // `fileToPostImageDataUrl`, ou URL https) — même contrat que
  // `Company.logo_url`/`banner_url`.
  @IsOptional()
  @IsString()
  image_url?: string;

  // Optionnel : `Publication.is_public` a `@default(true)` en base. Le client
  // n'a pas à le fournir pour un post normal.
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  // `likes_count` n'est jamais fourni par le client : il démarre à 0
  // (`@default(0)`) et n'évolue que via les likes. Laisser le client le poser
  // permettait de créer un post avec un compteur arbitraire.
}
