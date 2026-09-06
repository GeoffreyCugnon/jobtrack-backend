import { User } from '../../../prisma/generated/prisma/client';

/**
 * `User` sans aucun champ sensible (hash de mot de passe, jetons refresh et
 * réinitialisation). Forme renvoyée par l'API pour tout ce qui touche à un
 * utilisateur. Le filtrage runtime correspondant est `SAFE_USER_OMIT`
 * (`user.utils.ts`) — ce type n'est qu'une garantie de compilation.
 */
export type SafeUser = Omit<
  User,
  'password' | 'refreshToken' | 'resetPasswordToken' | 'resetPasswordExpires'
>;
