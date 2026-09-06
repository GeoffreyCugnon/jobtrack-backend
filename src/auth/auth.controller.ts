import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Res,
  Logger,
  Req,
  UnauthorizedException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import type { Response } from 'express';
import type { Request } from 'express';
import { User } from '../../prisma/generated/prisma/client';
import { AuthGuard } from './guards/auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { IRequestWithPayload } from './interface';
import { SafeUser } from '../user/interface/partielUser';
import { toSafeUser } from '../user/user.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async signUp(@Body() body: RegisterDto): Promise<SafeUser> {
    //hash password
    body.password = await this.authService.hash(body.password);
    //create user in db
    const user = await this.userService.create(body);
    return toSafeUser(user);
  }

  @Post('login')
  async signIn(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    try {
      //get user from db with Throw Not found exception if no user found
      const user = await this.userService.findByEmailOrThrow(body.email);
      //compare body.password with hashed user.password
      if (!(await this.authService.compare(body.password, user.password)))
        throw new Error();

      //generate tokens and put refreshToken in user in DB
      const accessToken = await this._generateTokensUpdateInDb(user, response);

      //return
      return { accessToken, user: toSafeUser(user) };
    } catch (error) {
      Logger.warn(error);
      throw new BadRequestException();
    }
  }

  @Post('refresh')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    try {
      if (!request.headers.cookie) throw new Error('No Cookie');

      //Extract Token from cookie
      const cookieToken = this.authService.extractTokenFromCookie(
        request.headers.cookie,
      );
      if (!cookieToken) throw new Error('No refreshToken cookie');

      //vérify JWT signature and if expired
      const payloadRefresh = await this.authService.verifyToken(
        cookieToken,
        'refresh',
      );

      //get user from db
      const user = await this.userService.findOneOrThrow(payloadRefresh.id);

      //compare tokens
      if (user.refreshToken != cookieToken)
        throw new Error("Tokens don't match");

      //generate tokens and put refreshToken in user in DB
      const accessToken = await this._generateTokensUpdateInDb(user, response);
      //return
      return { accessToken, user: toSafeUser(user) };
    } catch (error) {
      // Échec de refresh = cas courant (pas de cookie, token expiré, etc.),
      // pas une erreur serveur : on répond 401 sans polluer la console.
      Logger.debug(
        `refresh échoué : ${error instanceof Error ? error.message : 'inconnu'}`,
        AuthController.name,
      );
      throw new UnauthorizedException();
    }
  }

  async _generateTokensUpdateInDb(
    user: User,
    response: Response,
  ): Promise<string> {
    //create jwt
    const { accessToken, refreshToken } =
      await this.authService.generateJwts(user);
    //udpate user.refresh in db
    await this.userService.update(user.id, { refreshToken });
    //put refresh in cookie
    this.authService.insertTokenCookie(response, refreshToken);

    return accessToken;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: IRequestWithPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.userService.update(request.user.id, { refreshToken: null });
    this.authService.clearTokenCookie(response);

    return { message: 'Déconnexion réussie' };
  }

  /**
   * Étape 1 du "mot de passe oublié" : génère un token de réinitialisation à
   * durée de vie courte (15 min), le stocke hashé (argon2) sur l'utilisateur.
   * Réponse volontairement générique (pas d'énumération de comptes).
   *
   * LIMITATION : aucun service d'envoi d'email n'est configuré sur ce projet —
   * en dev, le lien de réinitialisation est écrit dans les logs serveur.
   */
  @Post('forgot-password')
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.',
    };

    if ((await this.userService.countByEmail(body.email)) === 0) {
      return genericResponse;
    }

    const user = await this.userService.findByEmailOrThrow(body.email);
    const token = randomBytes(32).toString('hex');
    const hashedToken = await this.authService.hash(token);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.userService.update(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/auth/reset-password?email=${encodeURIComponent(
      user.email,
    )}&token=${token}`;
    Logger.log(
      `[DEV] Lien de réinitialisation pour ${user.email} : ${resetUrl}`,
      AuthController.name,
    );

    return genericResponse;
  }

  /**
   * Étape 2 du "mot de passe oublié" : consomme le token (email + token +
   * nouveau mot de passe), met à jour le hash argon2, invalide le token de
   * réinitialisation ET le refresh token (force une reconnexion).
   */
  @Post('reset-password')
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userService.findByEmailOrThrow(body.email);

      if (!(await this.authService.verifyResetToken(body.token, user))) {
        throw new Error('Token de réinitialisation invalide ou expiré');
      }

      const hashedPassword = await this.authService.hash(body.newPassword);
      await this.userService.update(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null,
      });

      return { message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      Logger.warn(error);
      throw new BadRequestException();
    }
  }

  @Patch('password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() request: IRequestWithPayload,
    @Body() body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userService.findOneOrThrow(request.user.id);

      if (
        !(await this.authService.compare(body.currentPassword, user.password))
      ) {
        throw new Error('Mot de passe actuel incorrect');
      }

      const hashedPassword = await this.authService.hash(body.newPassword);
      await this.userService.update(user.id, { password: hashedPassword });

      return { message: 'Mot de passe mis à jour avec succès' };
    } catch (error) {
      Logger.warn(error);
      throw new BadRequestException();
    }
  }
}
