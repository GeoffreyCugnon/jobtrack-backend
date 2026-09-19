import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildETag } from '../utils/etag';

@Injectable()
export class SkillService {
  constructor(private readonly prisma: PrismaService) {}

  /** Signal léger pour l'ETag de `GET /skill` — scopé à `userId`, comme `listForUser`. */
  async getListETag(userId: number): Promise<string> {
    const agg = await this.prisma.user_skill.aggregate({
      where: { user_id: userId },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(userId, agg._count._all, agg._max.updated_at);
  }

  /** Noms des compétences de l'utilisateur, triés alphabétiquement. */
  async listForUser(userId: number): Promise<string[]> {
    const rows = await this.prisma.user_skill.findMany({
      where: { user_id: userId },
      include: { skill: { select: { name: true } } },
      orderBy: { skill: { name: 'asc' } },
    });
    return rows.map((row) => row.skill.name);
  }

  /**
   * Remplace toute la liste : `Skill` créés à la volée (unique par `name`),
   * `User_skill` synchronisés (ajout des nouveaux, retrait des absents).
   */
  async replaceForUser(userId: number, rawNames: string[]): Promise<string[]> {
    const names = Array.from(
      new Set(
        rawNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && name.length <= 60),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      const skills = await Promise.all(
        names.map((name) =>
          tx.skill.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          }),
        ),
      );
      const skillIds = skills.map((skill) => skill.id);

      await tx.user_skill.deleteMany({
        where: { user_id: userId, skill_id: { notIn: skillIds } },
      });
      if (skillIds.length > 0) {
        await tx.user_skill.createMany({
          data: skillIds.map((skill_id) => ({ user_id: userId, skill_id })),
          skipDuplicates: true,
        });
      }
    });

    return this.listForUser(userId);
  }
}
