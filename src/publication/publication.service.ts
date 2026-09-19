import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { buildETag } from '../utils/etag';

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
      // Pas de `timeAgo` précalculé ici : figé dans une réponse mise en
      // cache (ETag), il ne se périmerait qu'aux vraies mutations de
      // données, jamais au simple écoulement du temps. Le Front le
      // recalcule à chaque lecture (`publications.api.ts`) à partir de
      // `createdAt`.
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

  /**
   * Signal léger pour l'ETag de `GET /publication` : agrégat `publication`
   * combiné à un agrégat `comment` (sur les publications visibles) —
   * `commentsCount` dérive de `_count.comment` sans jamais toucher
   * `publication.updated_at` (commenter ne met pas à jour la publication).
   */
  async getListETag(): Promise<string> {
    const [publications, comments] = await Promise.all([
      this.prisma.publication.aggregate({
        where: { is_public: true, deleted_at: null },
        _max: { updated_at: true },
        _count: { _all: true },
      }),
      this.prisma.comment.aggregate({
        where: { publication: { is_public: true, deleted_at: null } },
        _max: { created_at: true },
        _count: { _all: true },
      }),
    ]);
    return buildETag(
      publications._count._all,
      publications._max.updated_at,
      comments._count._all,
      comments._max.created_at,
    );
  }

  /** `null` si la publication n'existe pas (ou est soft-supprimée) — même règle que `findOne()`. */
  async getDetailETag(id: number): Promise<string | null> {
    const row = await this.prisma.publication.findFirst({
      where: { id, deleted_at: null },
      select: { updated_at: true },
    });
    if (!row) {
      return null;
    }
    const comments = await this.prisma.comment.aggregate({
      where: { publication_id: id },
      _max: { created_at: true },
      _count: { _all: true },
    });
    return buildETag(
      id,
      row.updated_at,
      comments._count._all,
      comments._max.created_at,
    );
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

  /**
   * Charge une publication vivante et vérifie qu'elle appartient à `userId`.
   * Ne réutilise pas `utils/ownership.ts#assertOwnership` : ce helper est basé
   * sur `findUnique`, incompatible avec le filtre `deleted_at: null` requis ici.
   */
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
