import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  // URL distante (avatar généré) ou data URL d'image (upload depuis le profil,
  // redimensionné côté client). Cap large mais borné pour éviter d'énormes
  // payloads.
  @IsString()
  @MaxLength(500_000)
  @Matches(/^(https:\/\/|data:image\/)/, {
    message: 'avatarUrl doit être une URL https ou une data URL d’image',
  })
  avatarUrl: string;
}
