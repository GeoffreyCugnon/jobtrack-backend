import { IsInt, IsPositive } from 'class-validator';

export class CreateConnectionDto {
  /** Id de l'utilisateur à qui envoyer l'invitation. */
  @IsInt()
  @IsPositive()
  userId: number;
}
