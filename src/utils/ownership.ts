import { ForbiddenException, NotFoundException } from '@nestjs/common';

/** Délégué Prisma minimal : sait charger le `user_id` d'une ligne par `id`. */
interface OwnableDelegate {
  findUnique(args: {
    where: { id: number };
    select: { user_id: true };
  }): Promise<{ user_id: number | null } | null>;
}

/**
 * Vérifie qu'une ressource existe et appartient à `userId` (colonne `user_id`
 * directe). Lève `NotFoundException` / `ForbiddenException` avec les libellés
 * fournis. Remplace les `assertOwned` dupliqués des services à owner direct
 * (`application`, `comment`, `document`). Les modules à owner indirect
 * (`interview` via la candidature, `job_offering` via l'entreprise) gardent
 * leur logique propre. `publication` aussi : son `assertOwned` doit en plus
 * filtrer `deleted_at: null` (soft-delete), ce que `findUnique` ci-dessous ne
 * permet pas — pas une duplication oubliée, un besoin réellement différent.
 */
export async function assertOwnership(
  delegate: OwnableDelegate,
  id: number,
  userId: number,
  labels: { notFound: string; forbidden: string },
): Promise<void> {
  const row = await delegate.findUnique({
    where: { id },
    select: { user_id: true },
  });
  if (!row) {
    throw new NotFoundException(labels.notFound);
  }
  if (row.user_id !== userId) {
    throw new ForbiddenException(labels.forbidden);
  }
}
