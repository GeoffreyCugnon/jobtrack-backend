import { describe, expect, it, vi } from 'vitest';
import { DocumentService } from './document.service';

describe('DocumentService — propriété', () => {
  it('renvoie NotFound quand le document appartient à un autre (findOne)', async () => {
    const prisma = {
      document: { findUnique: vi.fn().mockResolvedValue({ user_id: 7 }) },
    } as any;

    const service = new DocumentService(prisma);

    await expect(service.findOneForUser(1, 42)).rejects.toThrow(/introuvable/i);
  });

  it('interdit update/remove du document d’un autre', async () => {
    const prisma = {
      document: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 7 }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as any;

    const service = new DocumentService(prisma);

    await expect(service.update(1, { title: 'x' }, 42)).rejects.toThrow(
      /vos propres documents/i,
    );
    await expect(service.remove(1, 42)).rejects.toThrow(
      /vos propres documents/i,
    );
    expect(prisma.document.update).not.toHaveBeenCalled();
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it('crée le document rattaché à l’utilisateur avec un file_url interne', async () => {
    const prisma = {
      document: {
        create: vi.fn().mockImplementation(({ data }: any) => ({
          id: 1,
          updated_at: new Date(),
          ...data,
        })),
      },
    } as any;

    const service = new DocumentService(prisma);
    await service.create({ title: 'Mon CV', type: 'CV' }, 42);

    const arg = prisma.document.create.mock.calls[0][0].data;
    expect(arg.user_id).toBe(42);
    expect(arg.file_url).toMatch(/^internal:\/\/document\/42\//);
  });
});
