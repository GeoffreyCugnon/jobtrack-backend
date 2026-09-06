import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from './interface/safe-user';
import { RegisterDto } from '../auth/dto/register.dto';
import { generateAvatarUrl, SAFE_USER_OMIT } from './user.utils';

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

  async findByEmailOrThrow(email: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { email } });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    await this.findOneOrThrow(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
      },
      omit: SAFE_USER_OMIT,
    });
  }

  async delete(id: number): Promise<User> {
    await this.findOneOrThrow(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
