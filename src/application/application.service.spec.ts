import { describe, expect, it, vi } from 'vitest';
import { ApplicationService } from './application.service';

describe('ApplicationService — propriété', () => {
  it('refuse la consultation d’une candidature appartenant à un autre', async () => {
    const prisma = {
      application: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 7, interview: [] }),
      },
    } as any;

    const service = new ApplicationService(prisma);

    await expect(service.findOneForUser(1, 42)).rejects.toThrow(
      /vos propres candidatures/i,
    );
  });

  it('refuse update/remove sur la candidature d’un autre', async () => {
    const prisma = {
      application: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 7 }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as any;

    const service = new ApplicationService(prisma);

    await expect(
      service.update(1, { status: 'ACCEPTED' as any }, 42),
    ).rejects.toThrow(/vos propres candidatures/i);
    await expect(service.remove(1, 42)).rejects.toThrow(
      /vos propres candidatures/i,
    );
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.delete).not.toHaveBeenCalled();
  });

  it('refuse la création sur une offre inexistante', async () => {
    const prisma = {
      job_offering: { findUnique: vi.fn().mockResolvedValue(null) },
      application: { create: vi.fn() },
    } as any;

    const service = new ApplicationService(prisma);

    await expect(service.create({ job_offering_id: 999 }, 42)).rejects.toThrow(
      /offre introuvable/i,
    );
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('refuse une seconde candidature à la même offre', async () => {
    const prisma = {
      job_offering: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
      application: {
        findFirst: vi.fn().mockResolvedValue({ id: 5 }),
        create: vi.fn(),
      },
    } as any;

    const service = new ApplicationService(prisma);

    await expect(service.create({ job_offering_id: 1 }, 42)).rejects.toThrow(
      /déjà postulé/i,
    );
    expect(prisma.application.create).not.toHaveBeenCalled();
  });
});

describe('ApplicationService — ETag', () => {
  it('scope l’agrégat de la liste à userId et combine avec les entretiens', async () => {
    const prisma = {
      application: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 2 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
      interview: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 1 },
          _max: { updated_at: new Date('2026-09-09T00:00:00Z') },
        }),
      },
    } as any;

    const service = new ApplicationService(prisma);
    const etag = await service.getListETag(42);

    expect(prisma.application.aggregate).toHaveBeenCalledWith({
      where: { user_id: 42 },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(prisma.interview.aggregate).toHaveBeenCalledWith({
      where: { application: { user_id: 42 } },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(etag).toMatch(/^".+"$/);
  });

  it('change l’ETag de liste quand seul un entretien change (planifier ne touche pas application.updated_at)', async () => {
    const prisma = {
      application: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 2 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
      interview: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({
            _count: { _all: 1 },
            _max: { updated_at: new Date('2026-09-09T00:00:00Z') },
          })
          .mockResolvedValueOnce({
            _count: { _all: 2 },
            _max: { updated_at: new Date('2026-09-11T00:00:00Z') },
          }),
      },
    } as any;

    const service = new ApplicationService(prisma);
    const first = await service.getListETag(42);
    const second = await service.getListETag(42);

    expect(first).not.toBe(second);
  });

  it('renvoie null pour l’ETag de détail d’une candidature absente ou d’un autre utilisateur', async () => {
    const prisma = {
      application: { findFirst: vi.fn().mockResolvedValue(null) },
      interview: { aggregate: vi.fn() },
    } as any;

    const service = new ApplicationService(prisma);
    const etag = await service.getDetailETag(1, 42);

    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: 1, user_id: 42 },
      select: { updated_at: true },
    });
    expect(prisma.interview.aggregate).not.toHaveBeenCalled();
    expect(etag).toBeNull();
  });
});
