import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface JobCategoryDto {
  key: string;
  label: string;
  description: string;
  isWorkMode: boolean;
  sortOrder: number;
}

@Injectable()
export class JobCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Référentiel complet, ordonné (`sort_order` puis `label`). Route publique. */
  async findAll(): Promise<JobCategoryDto[]> {
    const rows = await this.prisma.job_category.findMany({
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
    });

    return rows.map((row) => ({
      key: row.key,
      label: row.label,
      description: row.description,
      isWorkMode: row.is_work_mode,
      sortOrder: row.sort_order,
    }));
  }
}
