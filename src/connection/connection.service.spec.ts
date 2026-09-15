import { describe, expect, it, vi } from 'vitest';
import { ConnectionService } from './connection.service';

describe('ConnectionService.getListETag', () => {
  it('uses the same where clause as list()', async () => {
    const prisma = {
      connection: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 3 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
    } as any;

    const service = new ConnectionService(prisma);
    const etag = await service.getListETag(42);

    expect(prisma.connection.aggregate).toHaveBeenCalledWith({
      where: {
        OR: [{ user_action_id: 42 }, { user_receiver_id: 42 }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(etag).toMatch(/^".+"$/);
  });
});
