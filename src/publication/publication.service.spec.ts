import { describe, expect, it, vi } from 'vitest';
import { PublicationService } from './publication.service';

describe('PublicationService — ownership on update/remove', () => {
  it('rejects update of an unknown (or soft-deleted) publication with NotFound', async () => {
    const prisma = {
      publication: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as any;

    const service = new PublicationService(prisma);

    await expect(service.update(99, { title: 'x' }, 42)).rejects.toThrow(
      /introuvable/i,
    );
    expect(prisma.publication.update).not.toHaveBeenCalled();
  });

  it('rejects update/remove of a publication owned by another user', async () => {
    const prisma = {
      publication: {
        findFirst: vi.fn().mockResolvedValue({ user_id: 7 }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as any;

    const service = new PublicationService(prisma);

    await expect(service.update(1, { title: 'x' }, 42)).rejects.toThrow(
      /propres publications/i,
    );
    await expect(service.remove(1, 42)).rejects.toThrow(
      /propres publications/i,
    );
    expect(prisma.publication.update).not.toHaveBeenCalled();
    expect(prisma.publication.delete).not.toHaveBeenCalled();
  });

  it('allows update/remove when the caller owns the publication', async () => {
    const prisma = {
      publication: {
        findFirst: vi.fn().mockResolvedValue({ user_id: 42 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
        delete: vi.fn().mockResolvedValue({ id: 1 }),
      },
    } as any;

    const service = new PublicationService(prisma);

    await service.update(1, { title: 'x' }, 42);
    await service.remove(1, 42);

    expect(prisma.publication.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'x' },
    });
    expect(prisma.publication.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe('PublicationService — ETag', () => {
  it('combines the publication and comment aggregates for the list ETag', async () => {
    const prisma = {
      publication: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 4 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
      comment: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 9 },
          _max: { created_at: new Date('2026-09-09T00:00:00Z') },
        }),
      },
    } as any;

    const service = new PublicationService(prisma);
    const etag = await service.getListETag();

    expect(prisma.publication.aggregate).toHaveBeenCalledWith({
      where: { is_public: true, deleted_at: null },
      _max: { updated_at: true },
      _count: { _all: true },
    });
    expect(prisma.comment.aggregate).toHaveBeenCalledWith({
      where: { publication: { is_public: true, deleted_at: null } },
      _max: { created_at: true },
      _count: { _all: true },
    });
    expect(etag).toMatch(/^".+"$/);
  });

  it('changes the list ETag when only a comment is added (commenter ne touche pas publication.updated_at)', async () => {
    const prisma = {
      publication: {
        aggregate: vi.fn().mockResolvedValue({
          _count: { _all: 4 },
          _max: { updated_at: new Date('2026-09-10T00:00:00Z') },
        }),
      },
      comment: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({
            _count: { _all: 9 },
            _max: { created_at: new Date('2026-09-09T00:00:00Z') },
          })
          .mockResolvedValueOnce({
            _count: { _all: 10 },
            _max: { created_at: new Date('2026-09-11T00:00:00Z') },
          }),
      },
    } as any;

    const service = new PublicationService(prisma);
    const first = await service.getListETag();
    const second = await service.getListETag();

    expect(first).not.toBe(second);
  });

  it('returns null for the detail ETag of a missing (or soft-deleted) publication', async () => {
    const prisma = {
      publication: { findFirst: vi.fn().mockResolvedValue(null) },
      comment: { aggregate: vi.fn() },
    } as any;

    const service = new PublicationService(prisma);
    const etag = await service.getDetailETag(999);

    expect(prisma.comment.aggregate).not.toHaveBeenCalled();
    expect(etag).toBeNull();
  });
});
