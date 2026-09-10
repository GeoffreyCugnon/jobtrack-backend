import { describe, expect, it, vi } from 'vitest';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  it('rejette la création sur une publication inexistante (ou soft-deleted)', async () => {
    const prisma = {
      publication: { findFirst: vi.fn().mockResolvedValue(null) },
      comment: { create: vi.fn() },
    } as any;

    const service = new CommentService(prisma);

    await expect(
      service.create({ publication_id: 99, content: 'x' }, 42),
    ).rejects.toThrow(/introuvable/i);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('interdit la suppression du commentaire d’un autre utilisateur', async () => {
    const prisma = {
      comment: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 7 }),
        delete: vi.fn(),
      },
    } as any;

    const service = new CommentService(prisma);

    await expect(service.remove(1, 42)).rejects.toThrow(
      /propres commentaires/i,
    );
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it('supprime le commentaire quand l’appelant en est l’auteur', async () => {
    const prisma = {
      comment: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 42 }),
        delete: vi.fn().mockResolvedValue({ id: 1 }),
      },
    } as any;

    const service = new CommentService(prisma);

    await service.remove(1, 42);
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
