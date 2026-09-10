import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  @IsPositive()
  publication_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  content: string;

  // Réponse à un commentaire existant (`Comment.parent_comment_id`).
  @IsOptional()
  @IsInt()
  @IsPositive()
  parent_comment_id?: number;
}
