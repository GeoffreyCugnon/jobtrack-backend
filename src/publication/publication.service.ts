import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';

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
    const hoursAgo = Math.max(
      1,
      Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)),
    );
    const timeAgo =
      hoursAgo < 24
        ? `Il y a ${hoursAgo} h`
        : `Il y a ${Math.round(hoursAgo / 24)} j`;

    return {
      id: row.id,
      authorId: row.user_id,
      authorName:
        `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}`.trim() ||
        'Utilisateur',
      authorAvatarUrl: row.user?.avatar_url ?? null,
      title: row.title,
      content: row.content,
      type: row.type,
      createdAt: createdAt.toISOString(),
      timeAgo,
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

  update(id: number, updatePublicationDto: UpdatePublicationDto) {
    return this.prisma.publication.update({
      where: { id },
      data: { ...updatePublicationDto },
    });
  }

  remove(id: number) {
    return this.prisma.publication.delete({ where: { id } });
  }
}
