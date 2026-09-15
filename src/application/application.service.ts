import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { Application_status } from '../../prisma/generated/prisma/enums';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { assertOwnership } from '../utils/ownership';
import { buildETag } from '../utils/etag';

/** Ligne `Application` chargée ici (offre + entreprise + entretiens). */
type ApplicationRow = Prisma.ApplicationGetPayload<{
  include: {
    job_offering: { include: { company: { select: { name: true } } } };
    interview: { select: { scheduled_at: true } };
  };
}>;

const INCLUDE = {
  job_offering: { include: { company: { select: { name: true } } } },
  interview: { select: { scheduled_at: true } },
} as const;

const STATUS_LABEL: Record<Application_status, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: ApplicationRow) {
    const createdAt = new Date(row.created_at);
    // Le plus tardif des entretiens planifiés détermine si l'un d'eux est à
    // venir (MAX(scheduled_at) > maintenant <=> au moins un entretien à
    // venir). Champ brut plutôt qu'un booléen précalculé : un booléen figé
    // dans une réponse mise en cache (ETag) ne se périmerait qu'aux vraies
    // mutations de données, jamais au simple écoulement du temps — le Front
    // recalcule `hasUpcomingInterview`/`statusLabel` à chaque lecture
    // (`applications.api.ts`) à partir de cette valeur brute.
    const latestInterviewScheduledAt = row.interview.reduce<Date | null>(
      (latest, interview) => {
        const scheduledAt = new Date(interview.scheduled_at);
        return !latest || scheduledAt > latest ? scheduledAt : latest;
      },
      null,
    );

    return {
      id: row.id,
      jobOfferingId: row.job_offering_id,
      company: row.job_offering?.company?.name ?? 'Entreprise',
      role: row.job_offering?.title ?? 'Poste',
      status: row.status,
      statusLabel: STATUS_LABEL[row.status],
      interviewsCount: row.interview.length,
      latestInterviewScheduledAt: latestInterviewScheduledAt?.toISOString() ?? null,
      appliedDate: createdAt.toLocaleDateString('fr-FR'),
      createdAt: createdAt.toISOString(),
    };
  }

  /**
   * Signal léger pour l'ETag de `GET /application` — scopé à `userId`, comme
   * `findAllForUser`. Combine l'agrégat `application` avec un agrégat
   * `interview` : `hasUpcomingInterview`/`interviewsCount`/`statusLabel`
   * dérivent de cette relation sans jamais toucher `application.updated_at`
   * (planifier un entretien ne met pas à jour la candidature).
   */
  async getListETag(userId: number): Promise<string> {
    const [applications, interviews] = await Promise.all([
      this.prisma.application.aggregate({
        where: { user_id: userId },
        _max: { updated_at: true },
        _count: { _all: true },
      }),
      this.prisma.interview.aggregate({
        where: { application: { user_id: userId } },
        _max: { updated_at: true },
        _count: { _all: true },
      }),
    ]);
    return buildETag(
      userId,
      applications._count._all,
      applications._max.updated_at,
      interviews._count._all,
      interviews._max.updated_at,
    );
  }

  /** `null` si la candidature n'existe pas ou n'appartient pas à `userId`. */
  async getDetailETag(id: number, userId: number): Promise<string | null> {
    const row = await this.prisma.application.findFirst({
      where: { id, user_id: userId },
      select: { updated_at: true },
    });
    if (!row) {
      return null;
    }
    // Même raison qu'au-dessus : `hasUpcomingInterview` dérive de `interview`.
    const interviews = await this.prisma.interview.aggregate({
      where: { application_id: id },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(
      id,
      row.updated_at,
      interviews._count._all,
      interviews._max.updated_at,
    );
  }

  async findAllForUser(userId: number) {
    const rows = await this.prisma.application.findMany({
      where: { user_id: userId },
      include: INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOneForUser(id: number, userId: number) {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Candidature introuvable.');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres candidatures.',
      );
    }
    return this.toDto(row);
  }

  async create(dto: CreateApplicationDto, userId: number) {
    const offer = await this.prisma.job_offering.findUnique({
      where: { id: dto.job_offering_id },
      select: { id: true },
    });
    if (!offer) {
      throw new NotFoundException('Offre introuvable.');
    }

    // Pas de contrainte d'unicité en base sur [user_id, job_offering_id] :
    // vérif applicative pour bloquer une double candidature à la même offre.
    const existing = await this.prisma.application.findFirst({
      where: { user_id: userId, job_offering_id: dto.job_offering_id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Vous avez déjà postulé à cette offre.');
    }

    const row = await this.prisma.application.create({
      data: {
        user_id: userId,
        job_offering_id: dto.job_offering_id,
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: INCLUDE,
    });
    return this.toDto(row);
  }

  private assertOwned(id: number, userId: number): Promise<void> {
    return assertOwnership(this.prisma.application, id, userId, {
      notFound: 'Candidature introuvable.',
      forbidden: 'Vous ne pouvez modifier que vos propres candidatures.',
    });
  }

  async update(id: number, dto: UpdateApplicationDto, userId: number) {
    await this.assertOwned(id, userId);
    const row = await this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
      include: INCLUDE,
    });
    return this.toDto(row);
  }

  async remove(id: number, userId: number) {
    await this.assertOwned(id, userId);
    await this.prisma.application.delete({ where: { id } });
    return { id };
  }
}
