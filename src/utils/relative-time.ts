/**
 * Ancienneté d'une date, formatée en français : « Il y a 3 min » / « Il y a 5 h »
 * / « Il y a 2 j ». Source unique — remplace les implémentations dupliquées des
 * services (`job_offering`, `publication`, `comment`). Le Front reçoit la chaîne
 * déjà formatée.
 */
export function formatRelativeFr(date: Date | string): string {
  const then = new Date(date).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60_000));

  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;

  const days = Math.round(hours / 24);
  return `Il y a ${days} j`;
}

/**
 * Nombre d'heures écoulées depuis `date`, borné à `[1, max]`. Utilisé par
 * `job_offering` pour le champ `postedHoursAgo` (le Front trie dessus).
 */
export function hoursSince(date: Date | string, max = 168): number {
  const then = new Date(date).getTime();
  return Math.max(
    1,
    Math.min(max, Math.round((Date.now() - then) / 3_600_000)),
  );
}
