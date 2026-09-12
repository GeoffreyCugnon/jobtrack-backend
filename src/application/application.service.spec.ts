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
