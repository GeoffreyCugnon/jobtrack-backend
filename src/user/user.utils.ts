import { randomBytes } from 'node:crypto';
import { User } from '../../prisma/generated/prisma/client';
import { SafeUser } from './interface/safe-user';

/**
 * Champs sensibles d'un `User` à ne JAMAIS renvoyer au client : hash de mot de
 * passe et jetons (refresh + réinitialisation). À passer en `omit` sur toute
 * requête Prisma dont le résultat sort de l'API (`omit` est appliqué au
 * runtime, contrairement au type `SafeUser` qui n'est qu'une garantie de
 * compilation, effacée à l'exécution).
 */
export const SAFE_USER_OMIT = {
  password: true,
  refreshToken: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
} as const;

/**
 * Photo de profil par défaut d'un nouvel utilisateur : portrait réaliste servi
 * par randomuser.me (CDN public, pas de clé), choisi aléatoirement parmi un
 * jeu fixe (2 × 100 visages). Stockée telle quelle en base (`User.avatar_url`).
 */
export function generateAvatarUrl(): string {
  const n = randomBytes(4).readUInt32BE(0);
  const gender = n % 2 === 0 ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${gender}/${n % 100}.jpg`;
}

/**
 * Filtre un `User` déjà chargé (destructuration runtime). Volontairement
 * conservé en plus de `SAFE_USER_OMIT` : `auth` charge la ligne complète pour
 * comparer mot de passe / refresh token, puis renvoie la version « safe » sans
 * refaire une requête. Les routes `user` qui n'ont pas besoin du hash utilisent
 * `SAFE_USER_OMIT` (omit Prisma) directement.
 */
export function toSafeUser(user: User): SafeUser {
  const {
    password: _password,
    refreshToken: _refreshToken,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    ...safeUser
  } = user;
  return safeUser;
}
