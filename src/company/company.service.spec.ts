import { describe, expect, it, vi } from 'vitest';
import { CompanyService } from './company.service';

describe('CompanyService — ETag', () => {
  it('computes the list ETag from an aggregate over all companies', async () => {
    const prisma = {
      company: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 5 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
    } as any;

    const service = new CompanyService(prisma);
    const etag = await service.getListETag();

    expect(prisma.company.aggregate).toHaveBeenCalledWith({
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(etag).toMatch(/^".+"$/);
  });

  it('returns null for the detail ETag of a missing company', async () => {
    const prisma = {
      company: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    const service = new CompanyService(prisma);
    const etag = await service.getDetailETag(999);

    expect(etag).toBeNull();
  });

  it('returns null for getMineETag when the caller has no current employment', async () => {
    const prisma = {
      employment: { findFirst: vi.fn().mockResolvedValue(null) },
    } as any;

    const service = new CompanyService(prisma);
    const etag = await service.getMineETag(42);

    expect(prisma.employment.findFirst).toHaveBeenCalledWith({
      where: { user_id: 42, is_current: true },
      select: { company: { select: { id: true, updated_at: true } } },
    });
    expect(etag).toBeNull();
  });

  it('changes getMineETag when the current employment points to a different company', async () => {
    const prisma = {
      employment: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            company: { id: 1, updated_at: new Date('2026-09-10T00:00:00Z') },
          })
          .mockResolvedValueOnce({
            company: { id: 2, updated_at: new Date('2026-09-10T00:00:00Z') },
          }),
      },
    } as any;

    const service = new CompanyService(prisma);
    const first = await service.getMineETag(42);
    const second = await service.getMineETag(42);

    expect(first).not.toBe(second);
  });

  it('returns a stable ETag for getMineAllETag when the caller has no employment', async () => {
    const prisma = {
      employment: { findMany: vi.fn().mockResolvedValue([]) },
      company: { aggregate: vi.fn() },
    } as any;

    const service = new CompanyService(prisma);
    const etag = await service.getMineAllETag(42);

    expect(prisma.company.aggregate).not.toHaveBeenCalled();
    expect(etag).toMatch(/^".+"$/);
  });

  it('changes getMineAllETag when a company in the set is updated', async () => {
    const prisma = {
      employment: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ company_id: 1 }, { company_id: 2 }]),
      },
      company: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({
            _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
          })
          .mockResolvedValueOnce({
            _max: { updated_at: new Date('2026-09-11T00:00:00Z') },
          }),
      },
    } as any;

    const service = new CompanyService(prisma);
    const first = await service.getMineAllETag(42);
    const second = await service.getMineAllETag(42);

    expect(prisma.company.aggregate).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      _max: { updated_at: true },
    });
    expect(first).not.toBe(second);
  });
});
