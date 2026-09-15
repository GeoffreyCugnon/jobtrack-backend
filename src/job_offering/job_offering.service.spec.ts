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
              verified: true,
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
      description: '...',
      contractType: 'CDI',
      company: 'TechCorp',
      location: 'Nice, France',
      category: 'informatique',
      workMode: 'Hybrid',
      verified: true,
    });
  });

  it('maps offer.verified from the company.verified column, not a name whitelist', async () => {
    const prisma = {
      job_offering: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 2,
            title: 'Serveur en salle',
            description: '...',
            contract_type: 'CDD',
            created_at: new Date('2026-09-05T09:00:00Z'),
            // "TechCorp" used to be hard-coded as verified — now it must follow the column.
            company: {
              id: 9,
              name: 'TechCorp',
              address: 'Lyon',
              verified: false,
            },
          },
          {
            id: 3,
            title: 'Serveur en salle',
            description: '...',
            contract_type: 'CDD',
            created_at: new Date('2026-09-05T09:00:00Z'),
            company: {
              id: 10,
              name: 'Bistrot Inconnu',
              address: 'Lyon',
              verified: true,
            },
          },
        ]),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const result = await service.findAll();

    expect(result[0].verified).toBe(false);
    expect(result[1].verified).toBe(true);
  });

  it('defaults verified to false when the company relation is missing', async () => {
    const prisma = {
      job_offering: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 4,
            title: 'Poste sans entreprise liée',
            description: '...',
            contract_type: 'CDI',
            created_at: new Date('2026-09-05T09:00:00Z'),
            company: null,
          },
        ]),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const result = await service.findAll();

    expect(result[0].verified).toBe(false);
  });

  it('rejects offer creation when the user has no current employment', async () => {
    const prisma = {
      employment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      job_offering: {
        create: vi.fn(),
      },
    } as any;

    const service = new JobOfferingService(prisma);

    await expect(
      service.create(
        { title: 'Dev', description: '...', contract_type: 'CDI' as any },
        42,
      ),
    ).rejects.toThrow(/entreprise/i);
    expect(prisma.job_offering.create).not.toHaveBeenCalled();
  });

  it('creates an offer bound to the company of the user current employment', async () => {
    const prisma = {
      employment: {
        findFirst: vi.fn().mockResolvedValue({ company_id: 7 }),
      },
      job_offering: {
        create: vi.fn().mockResolvedValue({ id: 1, company_id: 7 }),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    await service.create(
      { title: 'Dev', description: '...', contract_type: 'CDI' },
      42,
    );

    expect(prisma.employment.findFirst).toHaveBeenCalledWith({
      where: { user_id: 42, is_current: true },
      select: { company_id: true },
    });
    expect(prisma.job_offering.create).toHaveBeenCalledWith({
      data: {
        title: 'Dev',
        description: '...',
        contract_type: 'CDI',
        company_id: 7,
      },
    });
  });

  it('rejects update of an unknown offer with NotFound', async () => {
    const prisma = {
      job_offering: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      employment: { findFirst: vi.fn() },
    } as any;

    const service = new JobOfferingService(prisma);

    await expect(service.update(99, { title: 'x' }, 42)).rejects.toThrow(
      /introuvable/i,
    );
    expect(prisma.job_offering.update).not.toHaveBeenCalled();
  });

  it('rejects update when the offer belongs to another company than the user current employment', async () => {
    const prisma = {
      job_offering: {
        findUnique: vi.fn().mockResolvedValue({ company_id: 7 }),
        update: vi.fn(),
      },
      employment: {
        findFirst: vi.fn().mockResolvedValue({ company_id: 3 }),
      },
    } as any;

    const service = new JobOfferingService(prisma);

    await expect(service.update(1, { title: 'x' }, 42)).rejects.toThrow(
      /votre entreprise/i,
    );
    expect(prisma.job_offering.update).not.toHaveBeenCalled();
  });

  it('allows update/remove when the offer company matches the user current employment', async () => {
    const prisma = {
      job_offering: {
        findUnique: vi.fn().mockResolvedValue({ company_id: 7 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
        delete: vi.fn().mockResolvedValue({ id: 1 }),
      },
      employment: {
        findFirst: vi.fn().mockResolvedValue({ company_id: 7 }),
      },
    } as any;

    const service = new JobOfferingService(prisma);

    await service.update(1, { title: 'x' }, 42);
    await service.remove(1, 42);

    expect(prisma.job_offering.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'x' },
    });
    expect(prisma.job_offering.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  const offerAgg = (count: number, maxUpdatedAt: Date) => ({
    _count: { _all: count },
    _max: { updated_at: maxUpdatedAt },
  });
  const applicationAgg = (count: number, maxCreatedAt: Date | null) => ({
    _count: { _all: count },
    _max: { created_at: maxCreatedAt },
  });

  it('computes the list ETag from aggregates, not a findMany', async () => {
    const prisma = {
      job_offering: {
        aggregate: vi
          .fn()
          .mockResolvedValue(offerAgg(3, new Date('2026-09-10T00:00:00Z'))),
        findMany: vi.fn(),
      },
      application: {
        aggregate: vi
          .fn()
          .mockResolvedValue(
            applicationAgg(5, new Date('2026-09-09T00:00:00Z')),
          ),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const etag = await service.getListETag();

    expect(prisma.job_offering.aggregate).toHaveBeenCalledWith({
      where: { deleted_at: null },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(prisma.application.aggregate).toHaveBeenCalledWith({
      where: { job_offering: { deleted_at: null } },
      _max: { created_at: true },
      _count: { _all: true },
    });
    expect(prisma.job_offering.findMany).not.toHaveBeenCalled();
    expect(etag).toMatch(/^".+"$/);
  });

  it('changes the list ETag when the offer aggregate changes', async () => {
    const prisma = {
      job_offering: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce(offerAgg(3, new Date('2026-09-10T00:00:00Z')))
          .mockResolvedValueOnce(offerAgg(4, new Date('2026-09-10T00:00:00Z'))),
      },
      application: {
        aggregate: vi
          .fn()
          .mockResolvedValue(
            applicationAgg(5, new Date('2026-09-09T00:00:00Z')),
          ),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const first = await service.getListETag();
    const second = await service.getListETag();

    expect(first).not.toBe(second);
  });

  it('changes the list ETag when only the application aggregate changes (postuler ne touche pas job_offering.updated_at)', async () => {
    const prisma = {
      job_offering: {
        aggregate: vi
          .fn()
          .mockResolvedValue(offerAgg(3, new Date('2026-09-10T00:00:00Z'))),
      },
      application: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce(
            applicationAgg(5, new Date('2026-09-09T00:00:00Z')),
          )
          .mockResolvedValueOnce(
            applicationAgg(6, new Date('2026-09-11T00:00:00Z')),
          ),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const first = await service.getListETag();
    const second = await service.getListETag();

    expect(first).not.toBe(second);
  });

  it('returns null for the detail ETag of a missing (or soft-deleted) offer', async () => {
    const prisma = {
      job_offering: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      application: { aggregate: vi.fn() },
    } as any;

    const service = new JobOfferingService(prisma);
    const etag = await service.getDetailETag(999);

    expect(prisma.job_offering.findFirst).toHaveBeenCalledWith({
      where: { id: 999, deleted_at: null },
      select: { updated_at: true },
    });
    expect(prisma.application.aggregate).not.toHaveBeenCalled();
    expect(etag).toBeNull();
  });

  it('changes the detail ETag when a new application comes in on the same offer', async () => {
    const prisma = {
      job_offering: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ updated_at: new Date('2026-09-10T00:00:00Z') }),
      },
      application: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce(
            applicationAgg(2, new Date('2026-09-09T00:00:00Z')),
          )
          .mockResolvedValueOnce(
            applicationAgg(3, new Date('2026-09-11T00:00:00Z')),
          ),
      },
    } as any;

    const service = new JobOfferingService(prisma);
    const first = await service.getDetailETag(1);
    const second = await service.getDetailETag(1);

    expect(prisma.application.aggregate).toHaveBeenCalledWith({
      where: { job_offering_id: 1 },
      _max: { created_at: true },
      _count: { _all: true },
    });
    expect(first).not.toBe(second);
  });
});
