import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { User } from '../generated/prisma/client';
import { IPayload } from './interface';
import { type Response } from 'express';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  //hachage password with argon2
  async hash(toHash: string): Promise<string> {
    return await argon2.hash(toHash);
  }
  //compare password
  async compare(notHashed: string, hashed: string): Promise<boolean> {
    return await argon2.verify(hashed, notHashed);
  }

  /**
   * Vérifie un token de réinitialisation de mot de passe : présent, non expiré,
   * et correspondant (argon2) au hash stocké en DB sur l'utilisateur.
   */
  async verifyResetToken(
    rawToken: string,
    user: Pick<User, 'resetPasswordToken' | 'resetPasswordExpires'>,
  ): Promise<boolean> {
    if (!user.resetPasswordToken || !user.resetPasswordExpires) {
      return false;
    }
    if (user.resetPasswordExpires.getTime() < Date.now()) {
      return false;
    }
    return this.compare(rawToken, user.resetPasswordToken);
  }

  async generateJwts(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: IPayload = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.ACCESS_JWT_EXPIRE as JwtSignOptions['expiresIn'],
      secret: process.env.ACCESS_SECRET_KEY,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.REFRESH_JWT_EXPIRE as JwtSignOptions['expiresIn'],
      secret: process.env.REFRESH_SECRET_KEY,
    });

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string, type: string = 'access'): Promise<IPayload> {
    return this.jwtService.verifyAsync<IPayload>(token, {
      algorithms: ['HS512'],
      secret:
        type == 'access'
          ? process.env.ACCESS_SECRET_KEY
          : process.env.REFRESH_SECRET_KEY,
    });
  }

  /**
   * Génère un JWT dédié pour authentifier cet utilisateur auprès du
   * micro-service de messagerie (MS-Messagerie) : HS256 (imposé côté MS,
   * distinct du HS512 utilisé ci-dessus pour les tokens de session JobTrack),
   * claim `sub` (id utilisateur stringifié — MS ne connaît que des ids
   * opaques), secret et durée de vie dédiés (`MESSAGING_JWT_SECRET` /
   * `MESSAGING_JWT_EXPIRE`). Voir `AuthController#getMessagingToken`.
   */
  async generateMessagingToken(user: Pick<User, 'id'>): Promise<string> {
    return this.jwtService.signAsync(
      { sub: String(user.id) },
      {
        algorithm: 'HS256',
        secret: process.env.MESSAGING_JWT_SECRET,
        expiresIn: process.env
          .MESSAGING_JWT_EXPIRE as JwtSignOptions['expiresIn'],
      },
    );
  }

  insertTokenCookie(response: Response, refreshToken: string): void {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.PROD === 'true',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }

  clearTokenCookie(response: Response): void {
    response.clearCookie('refreshToken', {
      path: '/auth/refresh',
      sameSite: 'strict',
    });
  }

  extractTokenFromCookie(cookie: string): string | undefined {
    const cookies = cookie.split(';').map((entry) => entry.trim());

    for (const entry of cookies) {
      const [key, ...valueParts] = entry.split('=');
      if (key === 'refreshToken') {
        return decodeURIComponent(valueParts.join('='));
      }
    }

    return undefined;
  }
}
