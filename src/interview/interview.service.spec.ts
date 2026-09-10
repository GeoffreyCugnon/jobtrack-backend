import { describe, expect, it, vi } from 'vitest';
import { InterviewService } from './interview.service';

describe('InterviewService — propriété (via la candidature)', () => {
  it('refuse la consultation d’un entretien rattaché à la candidature d’un autre', async () => {
    const prisma = {
      interview: {
        findUnique: vi.fn().mockResolvedValue({
          scheduled_at: new Date(),
          interview_type: 'VISIO',
          application: { user_id: 7, job_offering: null },
        }),
      },
    } as any;

    const service = new InterviewService(prisma);

    await expect(service.findOneForUser(1, 42)).rejects.toThrow(
      /vos propres entretiens/i,
    );
  });

  it('refuse la création sur la candidature d’un autre utilisateur', async () => {
    const prisma = {
      application: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 7 }),
      },
      interview: { create: vi.fn() },
    } as any;

    const service = new InterviewService(prisma);

    await expect(
      service.create(
        {
          application_id: 1,
          interview_type: 'VISIO' as any,
          scheduled_at: new Date().toISOString(),
        },
        42,
      ),
    ).rejects.toThrow(/vos candidatures/i);
    expect(prisma.interview.create).not.toHaveBeenCalled();
  });

  it('refuse update/remove sur l’entretien d’un autre', async () => {
    const prisma = {
      interview: {
        findUnique: vi.fn().mockResolvedValue({ application: { user_id: 7 } }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as any;

    const service = new InterviewService(prisma);

    await expect(service.update(1, {}, 42)).rejects.toThrow(
      /vos propres entretiens/i,
    );
    await expect(service.remove(1, 42)).rejects.toThrow(
      /vos propres entretiens/i,
    );
    expect(prisma.interview.update).not.toHaveBeenCalled();
    expect(prisma.interview.delete).not.toHaveBeenCalled();
  });
});
