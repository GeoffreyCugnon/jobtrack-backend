import { User } from '../../prisma/generated/prisma/client';
import { SafeUser } from './interface/partielUser';

export function toSafeUser(user: User): SafeUser {
  const { password, refreshToken, ...safeUser } = user;
  void password;
  void refreshToken;
  return safeUser;
}
