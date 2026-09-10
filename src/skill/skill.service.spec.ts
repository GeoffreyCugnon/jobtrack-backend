import { describe, expect, it, vi } from 'vitest';
import { SkillService } from './skill.service';

describe('SkillService.replaceForUser', () => {
  it('normalise (trim, dédoublonne, ignore les vides) avant de synchroniser', async () => {
    const tx = {
      skill: {
        upsert: vi
          .fn()
          .mockImplementation(({ where }: any) => ({ id: where.name.length })),
      },
      user_skill: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((cb: any) => cb(tx)),
      user_skill: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const service = new SkillService(prisma);
    await service.replaceForUser(7, ['  React ', 'React', '', 'Node']);

    // "React" (dédoublonné) + "Node" -> 2 upserts
    expect(tx.skill.upsert).toHaveBeenCalledTimes(2);
    expect(tx.user_skill.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 7, skill_id: { notIn: [5, 4] } },
    });
  });
});
