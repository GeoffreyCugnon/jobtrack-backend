import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  contact_name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  job_title: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  contact_email: string;

  @IsNotEmpty()
  @IsPhoneNumber()
  @MaxLength(50)
  phone_number?: string;
}
