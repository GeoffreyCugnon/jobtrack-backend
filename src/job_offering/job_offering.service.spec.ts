import { describe, expect, it, vi } from 'vitest';
import { JobOfferingService } from './job_offering.service';

describe('JobOfferingService', () => {
  it('returns a list of normalized offers with company and computed metadata', async () => {
    const prisma = {
      job_offering: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: 'Développeuse Fullstack',
            description: '...',
            contract_type: 'CDI',
            created_at: new Date('2026-09-05T09:00:00Z'),
            company: {
              id: 1,
              name: 'TechCorp',
              address: 'Nice, France',
              business_sector: 'IT',
            },
          },
        ]),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const result = await service.findAll();

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({
      id: 1,
      role: 'Développeuse Fullstack',
      company: 'TechCorp',
      location: 'Nice, France',
      category: 'informatique',
      workMode: 'Hybrid',
      verified: true,
    });
  });
});
