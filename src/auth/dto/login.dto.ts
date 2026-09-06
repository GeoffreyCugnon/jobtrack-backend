import {
  IsEmail,
  MaxLength,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';
export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  @MaxLength(255)
  password: string;
}
