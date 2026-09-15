import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Company } from '../../prisma/generated/prisma/client';
import { buildETag } from '../utils/etag';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée l'entreprise et rattache son créateur via un `Employment` (`job_title:
   * 'CEO'`) dans la même transaction — sans ce lien, rien ne permettrait de
   * répondre à « quelles entreprises cet utilisateur gère-t-il ? »
   * (`findMineAll`) ni de créer des offres pour elle
   * (`JobOfferingService.create` lit `Employment.is_current`). Un utilisateur
   * peut gérer plusieurs entreprises : chaque nouvelle création devient
   * l'entreprise « courante » (les `Employment.is_current` précédents de
   * l'utilisateur sont repassés à `false`) — `is_current` ne sert qu'à
   * désambiguïser sur quelle entreprise agissent les fonctionnalités qui
   * supposent une seule entreprise active (ex. création d'offre), pas à
   * limiter le nombre d'entreprises.
   */
  async create(dto: CreateCompanyDto, userId: number): Promise<Company> {
    const isName = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });
    if (isName) throw new ConflictException('Name already used !!!');

    return this.prisma.$transaction(async (tx) => {
      await tx.employment.updateMany({
        where: { user_id: userId, is_current: true },
        data: { is_current: false },
      });
      const company = await tx.company.create({ data: dto });
      await tx.employment.create({
        data: {
          user_id: userId,
          company_id: company.id,
          job_title: 'CEO',
          start_date: new Date(),
          is_current: true,
        },
      });
      return company;
    });
  }

  /** Entreprise de l'`Employment` courant de l'utilisateur, ou `null` s'il n'en a pas. */
  async findMine(userId: number): Promise<Company | null> {
    const employment = await this.prisma.employment.findFirst({
      where: { user_id: userId, is_current: true },
      include: { company: true },
    });
    return employment?.company ?? null;
  }

  /** Toutes les entreprises que l'utilisateur gère (une par `Employment`), plus récentes d'abord. */
  async findMineAll(userId: number): Promise<Company[]> {
    const employments = await this.prisma.employment.findMany({
      where: { user_id: userId },
      include: { company: true },
      orderBy: { created_at: 'desc' },
    });
    return employments.map((employment) => employment.company);
  }

  /**
   * Signal léger pour l'ETag de `GET /company` : `logo_url`/`banner_url` sont
   * des data URI `LongText` potentiellement volumineuses, donc l'agrégat
   * évite de les re-sérialiser/re-transférer quand rien n'a changé.
   */
  async getListETag(): Promise<string> {
    const agg = await this.prisma.company.aggregate({
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(agg._count._all, agg._max.updated_at);
  }

  /** `null` si l'entreprise n'existe pas. */
  async getDetailETag(id: number): Promise<string | null> {
    const row = await this.prisma.company.findUnique({
      where: { id },
      select: { updated_at: true },
    });
    return row ? buildETag(id, row.updated_at) : null;
  }

  /** `null` si l'utilisateur n'a pas d'entreprise courante — même règle que `findMine()`. */
  async getMineETag(userId: number): Promise<string | null> {
    const employment = await this.prisma.employment.findFirst({
      where: { user_id: userId, is_current: true },
      select: { company: { select: { id: true, updated_at: true } } },
    });
    return employment
      ? buildETag(employment.company.id, employment.company.updated_at)
      : null;
  }

  /**
   * Signal léger pour `GET /company/mine/all` : reflète à la fois l'ensemble
   * des entreprises gérées (ajout/retrait d'`Employment`) et leurs propres
   * changements (`Company.update()` ne touche jamais `Employment`).
   */
  async getMineAllETag(userId: number): Promise<string> {
    const employments = await this.prisma.employment.findMany({
      where: { user_id: userId },
      select: { company_id: true },
    });
    const companyIds = employments
      .map((e) => e.company_id)
      .sort((a, b) => a - b);
    if (companyIds.length === 0) {
      return buildETag(userId, 0);
    }
    const agg = await this.prisma.company.aggregate({
      where: { id: { in: companyIds } },
      _max: { updated_at: true },
    });
    return buildETag(userId, companyIds.join(','), agg._max.updated_at);
  }

  findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: number): Promise<Company> {
    return this.prisma.company.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Vérifie que `userId` peut agir sur l'entreprise `id` : elle doit être
   * celle de son `Employment` courant (même règle que
   * `JobOfferingService.assertCanManage`).
   */
  private async assertOwned(id: number, userId: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException(`Entreprise ${id} introuvable.`);
    }

    const employment = await this.prisma.employment.findFirst({
      where: { user_id: userId, is_current: true },
      select: { company_id: true },
    });
    if (!employment || employment.company_id !== id) {
      throw new ForbiddenException(
        'Vous ne pouvez gérer que votre propre entreprise.',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateCompanyDto,
    userId: number,
  ): Promise<Company> {
    await this.assertOwned(id, userId);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(id: number, userId: number): Promise<Company> {
    await this.assertOwned(id, userId);
    return this.prisma.company.delete({ where: { id } });
  }
}
