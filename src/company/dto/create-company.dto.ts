import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

/** Tranches d'effectif proposées par le formulaire Frontend (page « Créer votre entreprise »). */
export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
] as const;

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  business_sector: string;

  @IsOptional()
  @IsIn(COMPANY_SIZES)
  size?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL invalid' })
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // URL distante (https) ou data URL d'image (upload redimensionné côté
  // client) — même contrat que `UpdateAvatarDto.avatarUrl`.
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  @Matches(/^(https:\/\/|data:image\/)/, {
    message: 'logo_url doit être une URL https ou une data URL d’image',
  })
  logo_url?: string;

  // Même contrat que `logo_url` (URL https ou data URL d'image redimensionnée
  // côté client, cf. `fileToBannerDataUrl`).
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  @Matches(/^(https:\/\/|data:image\/)/, {
    message: 'banner_url doit être une URL https ou une data URL d’image',
  })
  banner_url?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
