import { describe, expect, it, vi } from 'vitest';
import { JobCategoryService } from './job_category.service';

describe('JobCategoryService.findAll', () => {
  it('mappe en camelCase et ordonne par sort_order puis label', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        key: 'informatique',
        label: 'Informatique',
        description: 'desc',
        is_work_mode: false,
        sort_order: 3,
      },
      {
        key: 'distance',
        label: 'À distance',
        description: 'desc',
        is_work_mode: true,
        sort_order: 1,
      },
    ]);
    const prisma = { job_category: { findMany } } as any;

    const result = await new JobCategoryService(prisma).findAll();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
    });
    expect(result[0]).toEqual({
      key: 'informatique',
      label: 'Informatique',
      description: 'desc',
      isWorkMode: false,
      sortOrder: 3,
    });
    expect(result[1].isWorkMode).toBe(true);
  });
});
