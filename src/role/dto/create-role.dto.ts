import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
