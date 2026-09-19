import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Interview_interview_type } from '../generated/prisma/enums';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { buildETag } from '../utils/etag';

/** Ligne `Interview` chargée ici (candidature -> offre -> entreprise). */
type InterviewRow = Prisma.InterviewGetPayload<{
  include: {
    application: {
      select: {
        user_id: true;
        job_offering: {
          select: { title: true; company: { select: { name: true } } };
        };
      };
    };
  };
}>;

const INCLUDE = {
  application: {
    select: {
      user_id: true,
      job_offering: {
        select: { title: true, company: { select: { name: true } } },
      },
    },
  },
} as const;

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: InterviewRow) {
    const scheduledAt = new Date(row.scheduled_at);
    const isPresentiel =
      row.interview_type === Interview_interview_type.PRESENTIEL;

    return {
      id: row.id,
      applicationId: row.application_id,
      company: row.application?.job_offering?.company?.name ?? 'Entreprise',
      role: row.application?.job_offering?.title ?? 'Poste',
      interviewType: row.interview_type,
      // Le Front ne connaît que « visio » / « presentiel » : le téléphone est
      // rangé avec la visio (pas de lieu physique).
      mode: isPresentiel ? 'presentiel' : 'visio',
      scheduledAt: scheduledAt.toISOString(),
      date: DATE_FMT.format(scheduledAt),
      // Pas de booléen `isUpcoming` précalculé ici : figé dans une réponse
      // mise en cache (ETag), il ne se périmerait qu'aux vraies mutations de
      // données, jamais au simple écoulement du temps. Le Front le recalcule
      // à chaque lecture (`interviews.api.ts`) à partir de `scheduledAt`.
      notes: row.notes ?? null,
      visioLink: isPresentiel ? null : (row.notes ?? null),
      location: isPresentiel ? (row.notes ?? null) : null,
    };
  }

  /** Signal léger pour l'ETag de `GET /interview` — scopé via la candidature, comme `findAllForUser`. */
  async getListETag(userId: number): Promise<string> {
    const agg = await this.prisma.interview.aggregate({
      where: { application: { user_id: userId } },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    return buildETag(userId, agg._count._all, agg._max.updated_at);
  }

  /** `null` si l'entretien n'existe pas ou que sa candidature n'appartient pas à `userId`. */
  async getDetailETag(id: number, userId: number): Promise<string | null> {
    const row = await this.prisma.interview.findFirst({
      where: { id, application: { user_id: userId } },
      select: { updated_at: true },
    });
    return row ? buildETag(id, row.updated_at) : null;
  }

  async findAllForUser(userId: number) {
    const rows = await this.prisma.interview.findMany({
      where: { application: { user_id: userId } },
      include: INCLUDE,
      orderBy: { scheduled_at: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOneForUser(id: number, userId: number) {
    const row = await this.prisma.interview.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Entretien introuvable.');
    }
    if (row.application?.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres entretiens.',
      );
    }
    return this.toDto(row);
  }

  /** Vérifie que la candidature ciblée appartient bien à `userId`. */
  private async assertApplicationOwned(
    applicationId: number,
    userId: number,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { user_id: true },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable.');
    }
    if (application.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez planifier un entretien que sur vos candidatures.',
      );
    }
  }

  async create(dto: CreateInterviewDto, userId: number) {
    await this.assertApplicationOwned(dto.application_id, userId);
    const row = await this.prisma.interview.create({
      data: {
        application_id: dto.application_id,
        interview_type: dto.interview_type,
        scheduled_at: new Date(dto.scheduled_at),
        notes: dto.notes ?? null,
      },
      include: INCLUDE,
    });
    return this.toDto(row);
  }

  private async assertOwned(id: number, userId: number): Promise<number> {
    const row = await this.prisma.interview.findUnique({
      where: { id },
      select: { application: { select: { user_id: true } } },
    });
    if (!row) {
      throw new NotFoundException('Entretien introuvable.');
    }
    if (row.application?.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres entretiens.',
      );
    }
    return id;
  }

  async update(id: number, dto: UpdateInterviewDto, userId: number) {
    await this.assertOwned(id, userId);
    const row = await this.prisma.interview.update({
      where: { id },
      data: {
        ...(dto.interview_type ? { interview_type: dto.interview_type } : {}),
        ...(dto.scheduled_at
          ? { scheduled_at: new Date(dto.scheduled_at) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
      },
      include: INCLUDE,
    });
    return this.toDto(row);
  }

  async remove(id: number, userId: number) {
    await this.assertOwned(id, userId);
    await this.prisma.interview.delete({ where: { id } });
    return { id };
  }
}
