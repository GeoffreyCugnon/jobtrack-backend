import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

/**
 * Remplace la liste complète des compétences de l'utilisateur. Le service
 * normalise ensuite (trim, dédoublonnage, retrait des vides, plafond 60 car.).
 */
export class UpdateSkillsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  skills: string[];
}
