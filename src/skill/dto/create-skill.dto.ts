import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSkillDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;
}
