import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './interface/safe-user';
import { RegisterDto } from '../auth/dto/register.dto';
import { generateAvatarUrl, SAFE_USER_OMIT } from './user.utils';
import { buildETag } from '../utils/etag';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: RegisterDto): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          ...dto,
          avatar_url: generateAvatarUrl(),
        },
      });
    } catch {
      throw new ConflictException('Email is already used');
    }
  }
  async countByEmail(email: string): Promise<number> {
    return await this.prisma.user.count({ where: { email } });
  }

  /**
   * Renvoie la ligne `User` COMPLÈTE (hash + jetons compris). Réservé aux
   * usages internes qui en ont besoin : `auth` (comparaison du mot de passe,
   * du refresh token). Ne jamais renvoyer ce résultat tel quel dans une
   * réponse HTTP — utiliser `findOneSafeOrThrow`.
   */
  async findOneOrThrow(id: number): Promise<User> {
    return await this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  /** Variante « safe » de `findOneOrThrow` : sans hash ni jetons. */
  async findOneSafeOrThrow(id: number): Promise<SafeUser> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      omit: SAFE_USER_OMIT,
    });
  }

  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({ omit: SAFE_USER_OMIT });
  }

  /** Signal léger pour l'ETag de `GET /user` — même absence de filtre que `findAll()`. */
  async getListETag(): Promise<string> {
    const agg = await this.prisma.user.aggregate({
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(agg._count._all, agg._max.updated_at);
  }

  /** `null` si l'utilisateur n'existe pas. */
  async getDetailETag(id: number): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { updated_at: true },
    });
    return row ? buildETag(id, row.updated_at) : null;
  }

  async findByEmailOrThrow(email: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { email } });
  }

  /**
   * Réservé aux champs exposés dans `SafeUser` (profil, avatar, préférences —
   * voir `UserController`) : bump explicite de `updated_at` pour que l'ETag
   * de `GET /user`/`GET /user/:id` invalide correctement. Pas de `@updatedAt`
   * au niveau du schéma ici : `User.updated_at` serait alors aussi bumpé par
   * les écritures internes d'`auth` (refreshToken à chaque login/refresh,
   * hash de mot de passe) via `updateInternal()`, qui ne touchent aucun champ
   * `SafeUser` — l'ETag churnerait en permanence sans rapport avec le profil
   * réellement affiché.
   */
  async update(id: number, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    await this.findOneOrThrow(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
      omit: SAFE_USER_OMIT,
    });
  }

  /**
   * Écriture interne (refreshToken, hash de mot de passe, token de reset) —
   * réservée à `AuthController`. Ne touche jamais `updated_at` : voir la note
   * sur `update()` ci-dessus.
   */
  async updateInternal(
    id: number,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    await this.findOneOrThrow(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: number): Promise<User> {
    await this.findOneOrThrow(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
