import { createHash } from 'node:crypto';

/**
 * ETag dérivé d'un signal léger (id + updated_at pour une ressource, agrégat
 * count + MAX(updated_at) pour une collection) — jamais un hash du payload
 * complet. Le but est d'éviter la requête/sérialisation coûteuse quand rien
 * n'a changé, pas de remplacer `staleTime` côté Frontend (cf. JobTrack/CLAUDE.md).
 */
export function buildETag(
  ...parts: Array<string | number | Date | null | undefined>
): string {
  const raw = parts
    .map((part) => (part instanceof Date ? part.getTime() : (part ?? 'null')))
    .join(':');
  return `"${createHash('sha1').update(raw).digest('hex')}"`;
}

/** Compare l'ETag courant au header `If-None-Match` (potentiellement multi-valeurs, séparées par des virgules). */
export function matchesETag(
  ifNoneMatch: string | undefined,
  etag: string,
): boolean {
  if (!ifNoneMatch) {
    return false;
  }
  return ifNoneMatch
    .split(',')
    .map((tag) => tag.trim())
    .includes(etag);
}
