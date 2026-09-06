import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  business_sector: string;

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
  @IsBoolean()
  is_public?: boolean;
}
