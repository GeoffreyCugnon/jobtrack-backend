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
 * Avatar par défaut d'un nouvel utilisateur : image générée à la volée par
 * DiceBear (service public, pas de clé) à partir d'un seed aléatoire — stocké
 * tel quel en base (`User.avatar_url`).
 */
export function generateAvatarUrl(): string {
  const seed = randomBytes(16).toString('hex');
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
}

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
