import {
  Controller,
  Post,
  Body,
  ConflictException,
  BadRequestException,
  Res,
  Logger,
  Req,
  UnauthorizedException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/Login.dto';
import { UserService } from '../user/user.service';
import type { Response } from 'express';
import type { Request } from 'express';
import { User } from '../../prisma/generated/prisma/client';
import { AuthGuard } from './guards/auth.guard';
import { ChangePasswordDto } from './dto/changePassword.dto';
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
    console.log('Req.headers.cookie', request.headers.cookie);

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
      Logger.error('Erreur refresh', error);
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
