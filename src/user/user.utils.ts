import { User } from '../../prisma/generated/prisma/client';
import { SafeUser } from './interface/partielUser';

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
