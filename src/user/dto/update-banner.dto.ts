import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateBannerDto {
  // URL https ou data URL d'image (bannière uploadée depuis le profil,
  // redimensionnée côté client). Cap large — une bannière est plus lourde qu'un
  // avatar — mais borné pour éviter des payloads démesurés. Stocké en LONGTEXT.
  @IsString()
  @MaxLength(1_500_000)
  @Matches(/^(https:\/\/|data:image\/)/, {
    message: 'bannerUrl doit être une URL https ou une data URL d’image',
  })
  bannerUrl: string;
}
