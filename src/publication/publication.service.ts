import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { formatRelativeFr } from '../utils/relative-time';

/** Ligne `Publication` telle que chargée ici (auteur + compteur de commentaires). */
type PublicationRow = Prisma.PublicationGetPayload<{
  include: {
    user: { select: { first_name: true; last_name: true; avatar_url: true } };
    _count: { select: { comment: true } };
  };
}>;

const INCLUDE = {
  user: {
    select: { first_name: true, last_name: true, avatar_url: true },
  },
  _count: { select: { comment: true } },
} as const;

@Injectable()
export class PublicationService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: PublicationRow) {
    const createdAt = new Date(row.created_at);

    return {
      id: row.id,
      authorId: row.user_id,
      authorName:
        `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}`.trim() ||
        'Utilisateur',
      authorAvatarUrl: row.user?.avatar_url ?? null,
      title: row.title,
      content: row.content,
      imageUrl: row.image_url ?? null,
      type: row.type,
      createdAt: createdAt.toISOString(),
      timeAgo: formatRelativeFr(createdAt),
      likesCount: row.likes_count,
      commentsCount: row._count.comment,
      // Pas de table de republications pour l'instant : valeur dérivée
      // (déterministe) pour l'affichage, à remplacer par un vrai compteur.
      sharesCount: Math.round(row.likes_count * 0.15),
    };
  }

  create(createPublicationDto: CreatePublicationDto, userId: number) {
    return this.prisma.publication.create({
      data: { ...createPublicationDto, user_id: userId },
    });
  }

  async findAll() {
    const rows = await this.prisma.publication.findMany({
      where: { is_public: true, deleted_at: null },
      include: INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: number) {
    const row = await this.prisma.publication.findFirst({
      where: { id, deleted_at: null },
      include: INCLUDE,
    });
    return row ? this.toDto(row) : null;
  }

  /** Charge une publication vivante et vérifie qu'elle appartient à `userId`. */
  private async assertOwned(id: number, userId: number): Promise<void> {
    const row = await this.prisma.publication.findFirst({
      where: { id, deleted_at: null },
      select: { user_id: true },
    });
    if (!row) {
      throw new NotFoundException('Publication introuvable.');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres publications.',
      );
    }
  }

  async update(
    id: number,
    updatePublicationDto: UpdatePublicationDto,
    userId: number,
  ) {
    await this.assertOwned(id, userId);
    return this.prisma.publication.update({
      where: { id },
      data: { ...updatePublicationDto },
    });
  }

  async remove(id: number, userId: number) {
    await this.assertOwned(id, userId);
    return this.prisma.publication.delete({ where: { id } });
  }
}
