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
