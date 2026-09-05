import { User } from '../../../prisma/generated/prisma/client';

export type UserWithoutPass = Omit<User, 'password'>;
export type SafeUser = Omit<User, 'password' | 'refreshToken'>;
