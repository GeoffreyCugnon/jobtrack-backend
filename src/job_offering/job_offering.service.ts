import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/generated/prisma/client';
import { CreateJobOfferingDto } from './dto/create-job_offering.dto';
import { UpdateJobOfferingDto } from './dto/update-job_offering.dto';

/** Ligne `job_offering` telle que chargée par `findAll()`/`findOne()` (relations incluses). */
type OfferRow = Prisma.Job_offeringGetPayload<{
  include: { company: true; application: { select: { id: true } } };
}>;

const CATEGORY_BY_KEYWORD: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: [
      'fullstack',
      'frontend',
      'backend',
      'devops',
      'software',
      'logiciel',
      'ingenieur',
      'developer',
      'data',
    ],
    category: 'informatique',
  },
  {
    keywords: [
      'formation',
      'formateur',
      'enseignant',
      'professeur',
      'education',
      'pédagogie',
    ],
    category: 'enseignement',
  },
  {
    keywords: ['marketing', 'communication', 'community', 'content', 'social'],
    category: 'marketing',
  },
  {
    keywords: ['finance', 'comptable', 'analyste financier', 'banque', 'audit'],
    category: 'finance',
  },
  {
    keywords: [
      'admin',
      'administratif',
      'gestionnaire',
      'agent',
      'secrétaire',
      'caf',
    ],
    category: 'administration',
  },
  {
    keywords: ['vente', 'commercial', 'magasin', 'retail', 'caissier', 'shop'],
    category: 'commerce',
  },
  {
    keywords: ['livreur', 'logistique', 'transport', 'warehouse', 'magasinier'],
    category: 'transport',
  },
  {
    keywords: ['infirmier', 'soin', 'santé', 'health', 'medical'],
    category: 'sante',
  },
  {
    keywords: [
      'hotel',
      'réception',
      'restaurant',
      'rang',
      'hôtellerie',
      'cuisine',
    ],
    category: 'hotellerie',
  },
  {
    keywords: ['remote', 'distanc', 'full remote', 'teletravail'],
    category: 'distance',
  },
  { keywords: ['hybride', 'hybrid'], category: 'hybride' },
  {
    keywords: ['temps partiel', 'part-time', 'part time'],
    category: 'temps-partiel',
  },
];

const WORK_MODE_BY_KEYWORD: Array<{
  keywords: string[];
  workMode: 'Remote' | 'Hybrid' | 'onSite';
}> = [
  {
    keywords: ['remote', 'distanc', 'télétravail', 'full remote'],
    workMode: 'Remote',
  },
  { keywords: ['hybride', 'hybrid'], workMode: 'Hybrid' },
  { keywords: ['sur site', 'site', 'onsite', 'on-site'], workMode: 'onSite' },
];

@Injectable()
export class JobOfferingService {
  constructor(private readonly prisma: PrismaService) {}

  private inferCategory(title: string): string {
    const normalizedTitle = title.toLowerCase();
    const match = CATEGORY_BY_KEYWORD.find(({ keywords }) =>
      keywords.some((keyword) => normalizedTitle.includes(keyword)),
    );
    return match?.category ?? 'informatique';
  }

  private inferWorkMode(title: string): 'Remote' | 'Hybrid' | 'onSite' {
    const normalizedTitle = title.toLowerCase();
    const match = WORK_MODE_BY_KEYWORD.find(({ keywords }) =>
      keywords.some((keyword) => normalizedTitle.includes(keyword)),
    );
    if (match) {
      return match.workMode;
    }

    if (
      [
        'fullstack',
        'frontend',
        'backend',
        'developpeur',
        'developpeuse',
        'software',
        'data',
        'ingenieur',
      ].some((keyword) => normalizedTitle.includes(keyword))
    ) {
      return 'Hybrid';
    }

    return 'onSite';
  }

  private toOfferDto(row: OfferRow) {
    const createdAt = new Date(row.created_at);
    const hoursAgo = Math.max(
      1,
      Math.min(
        168,
        Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)),
      ),
    );

    return {
      id: row.id,
      role: row.title,
      description: row.description,
      contractType: row.contract_type,
      company: row.company?.name ?? 'Entreprise',
      location: row.company?.address ?? 'France',
      timeAgo: `Il y a ${hoursAgo}h`,
      postedHoursAgo: hoursAgo,
      category: this.inferCategory(row.title),
      workMode: this.inferWorkMode(row.title),
      applicantCount: row.application?.length ?? 0,
      verified: row.company?.verified ?? false,
    };
  }

  async create(createJobOfferingDto: CreateJobOfferingDto, userId: number) {
    const { title, description, contract_type } = createJobOfferingDto;

    const employment = await this.prisma.employment.findFirst({
      where: { user_id: userId, is_current: true },
      select: { company_id: true },
    });

    if (!employment) {
      throw new ForbiddenException(
        'Aucune entreprise associée à cet utilisateur : impossible de créer une offre.',
      );
    }

    return this.prisma.job_offering.create({
      data: {
        title,
        description,
        contract_type,
        company_id: employment.company_id,
      },
    });
  }

  async findAll() {
    const rows = await this.prisma.job_offering.findMany({
      include: {
        company: true,
        application: { select: { id: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => this.toOfferDto(row));
  }

  async findOne(id: number) {
    const row = await this.prisma.job_offering.findUnique({
      where: { id },
      include: { company: true, application: { select: { id: true } } },
    });

    if (!row) {
      return null;
    }

    return this.toOfferDto(row);
  }

  update(id: number, updateJobOfferingDto: UpdateJobOfferingDto) {
    return this.prisma.job_offering.update({
      where: { id },
      data: {
        ...updateJobOfferingDto,
      },
    });
  }

  remove(id: number) {
    return this.prisma.job_offering.delete({ where: { id } });
  }
}
