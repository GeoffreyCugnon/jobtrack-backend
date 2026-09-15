import { describe, expect, it, vi } from 'vitest';
import { UserService } from './user.service';

describe('UserService — ETag', () => {
  it('computes the list ETag from an aggregate over all users', async () => {
    const prisma = {
      user: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 12 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
    } as any;

    const service = new UserService(prisma);
    const etag = await service.getListETag();

    expect(prisma.user.aggregate).toHaveBeenCalledWith({
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(etag).toMatch(/^".+"$/);
  });

  it('returns null for the detail ETag of a missing user', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    const service = new UserService(prisma);
    const etag = await service.getDetailETag(999);

    expect(etag).toBeNull();
  });
});

describe('UserService.update vs updateInternal', () => {
  it('update() bumps updated_at explicitly (safe/profile fields)', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
      },
    } as any;

    const service = new UserService(prisma);
    await service.update(1, { headline: 'Dev' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { headline: 'Dev', updated_at: expect.any(Date) },
      omit: expect.anything(),
    });
  });

  it('updateInternal() never touches updated_at (refreshToken / password churn)', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
      },
    } as any;

    const service = new UserService(prisma);
    await service.updateInternal(1, { refreshToken: 'abc' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { refreshToken: 'abc' },
    });
  });
});
