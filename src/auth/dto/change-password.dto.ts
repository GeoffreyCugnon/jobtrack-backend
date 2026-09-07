import { IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  // Même politique que `CreateUserDto` / `LoginDto` et que le `passwordSchema`
  // du Front : 8 caractères min. avec minuscule, majuscule, chiffre et symbole.
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  @MaxLength(255)
  newPassword: string;
}
