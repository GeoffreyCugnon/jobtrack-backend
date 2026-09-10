import {
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
    const hasUpcomingInterview = row.interview.some(
      (interview) => new Date(interview.scheduled_at).getTime() > Date.now(),
    );

    return {
      id: row.id,
      jobOfferingId: row.job_offering_id,
      company: row.job_offering?.company?.name ?? 'Entreprise',
      role: row.job_offering?.title ?? 'Poste',
      status: row.status,
      // « Entretien prévu » prime sur le statut brut tant qu'un entretien est à
      // venir (c'est l'info utile pour le candidat) ; sinon libellé du statut.
      statusLabel: hasUpcomingInterview
        ? 'Entretien prévu'
        : STATUS_LABEL[row.status],
      hasUpcomingInterview,
      interviewsCount: row.interview.length,
      appliedDate: createdAt.toLocaleDateString('fr-FR'),
      createdAt: createdAt.toISOString(),
    };
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
