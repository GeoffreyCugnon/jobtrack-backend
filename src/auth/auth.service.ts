import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../prisma/generated/prisma/client';
import { IPayload } from './interface';
import { request, type Response } from 'express';

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
      expiresIn: process.env.ACCESS_JWT_EXPIRE as any,
      secret: process.env.ACCESS_SECRET_KEY as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.REFRESH_JWT_EXPIRE as any,
      secret: process.env.REFRESH_SECRET_KEY as any,
    });

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string, type: string = 'access'): Promise<IPayload> {
    const payload = await this.jwtService.verifyAsync(token, {
      algorithms: ['HS512'],
      secret:
        type == 'access'
          ? (process.env.ACCESS_SECRET_KEY as any)
          : (process.env.REFRESH_SECRET_KEY as any),
    });
    return payload;
  }

  insertTokenCookie(response: Response, refreshToken: string): void {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: process.env.PROD as any,
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }

  extractTokenFromCookie(cookie: string): string | undefined {
    const [key, token] = cookie?.split('=') ?? [];
    return key === 'refreshToken' ? token : undefined;
  }
}
