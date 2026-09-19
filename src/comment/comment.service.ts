import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { formatRelativeFr } from '../utils/relative-time';
import { assertOwnership } from '../utils/ownership';

/** Ligne `Comment` chargée ici (auteur inclus pour l'affichage). */
type CommentRow = Prisma.CommentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        first_name: true;
        last_name: true;
        avatar_url: true;
      };
    };
  };
}>;

const INCLUDE = {
  user: {
    select: { id: true, first_name: true, last_name: true, avatar_url: true },
  },
} as const;

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: CommentRow) {
    const createdAt = new Date(row.created_at);

    return {
      id: row.id,
      publicationId: row.publication_id,
      parentCommentId: row.parent_comment_id ?? null,
      authorId: row.user_id,
      author:
        `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}`.trim() ||
        'Utilisateur',
      authorAvatarUrl: row.user?.avatar_url ?? null,
      text: row.content,
      createdAt: createdAt.toISOString(),
      time: formatRelativeFr(createdAt),
    };
  }

  async findByPublication(publicationId: number) {
    const rows = await this.prisma.comment.findMany({
      where: { publication_id: publicationId },
      include: INCLUDE,
      orderBy: { created_at: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(dto: CreateCommentDto, userId: number) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: dto.publication_id, deleted_at: null },
      select: { id: true },
    });
    if (!publication) {
      throw new NotFoundException('Publication introuvable.');
    }

    const row = await this.prisma.comment.create({
      data: {
        publication_id: dto.publication_id,
        parent_comment_id: dto.parent_comment_id ?? null,
        content: dto.content,
        user_id: userId,
      },
      include: INCLUDE,
    });
    return this.toDto(row);
  }

  async remove(id: number, userId: number) {
    await assertOwnership(this.prisma.comment, id, userId, {
      notFound: 'Commentaire introuvable.',
      forbidden: 'Vous ne pouvez supprimer que vos propres commentaires.',
    });
    await this.prisma.comment.delete({ where: { id } });
    return { id };
  }
}
