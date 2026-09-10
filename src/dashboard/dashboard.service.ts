import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Compteurs des 3 tuiles du tableau de bord pour l'utilisateur courant. */
  async statsForUser(userId: number) {
    const now = new Date();

    const [activeApplications, upcomingInterviews, availableOffers] =
      await Promise.all([
        this.prisma.application.count({
          where: {
            user_id: userId,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        }),
        this.prisma.interview.count({
          where: {
            application: { user_id: userId },
            scheduled_at: { gt: now },
          },
        }),
        this.prisma.job_offering.count({ where: { deleted_at: null } }),
      ]);

    return { activeApplications, upcomingInterviews, availableOffers };
  }
}
