import {
  Body,
  Controller,
  Get,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Patch,
  HttpCode,
  ForbiddenException,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser } from './interface/safe-user';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { matchesETag } from '../utils/etag';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profil')
  async getMyProfil(@Req() request: IRequestWithPayload): Promise<SafeUser> {
    return await this.userService.findOneSafeOrThrow(request.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SafeUser | undefined> {
    const etag = await this.userService.getDetailETag(id);
    if (etag && matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    if (etag) {
      response.setHeader('ETag', etag);
    }
    return this.userService.findOneSafeOrThrow(id);
  }

  @Get()
  async findAll(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SafeUser[] | undefined> {
    const etag = await this.userService.getListETag();
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return await this.userService.findAll();
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Req() request: IRequestWithPayload,
  ): Promise<SafeUser> {
    this._assertSelf(id, request);
    return await this.userService.update(id, body);
  }

  @Patch('settings/notifications')
  async updateNotifications(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateNotificationsDto,
  ): Promise<SafeUser> {
    return await this.userService.update(request.user.id, body);
  }

  @Patch('settings/language')
  async updateLanguage(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateLanguageDto,
  ): Promise<SafeUser> {
    return await this.userService.update(request.user.id, body);
  }

  @Patch('profile')
  async updateProfile(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateProfileDto,
  ): Promise<SafeUser> {
    // Chaîne vide = champ effacé -> `null` en base.
    const data = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ]),
    );
    return this.userService.update(request.user.id, data);
  }

  @Patch('avatar')
  async updateAvatar(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateAvatarDto,
  ): Promise<SafeUser> {
    return await this.userService.update(request.user.id, {
      avatar_url: body.avatarUrl,
    });
  }

  @Patch('banner')
  async updateBanner(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateBannerDto,
  ): Promise<SafeUser> {
    return await this.userService.update(request.user.id, {
      banner_url: body.bannerUrl,
    });
  }

  @Delete('account')
  @HttpCode(204)
  async deleteMyAccount(@Req() request: IRequestWithPayload): Promise<void> {
    await this.userService.delete(request.user.id);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: IRequestWithPayload,
  ): Promise<{ data: null; message: string }> {
    this._assertSelf(id, request);
    await this.userService.delete(id);
    return {
      data: null,
      message: `Le user avec l'id ${id} a été supprimé avec succès.`,
    };
  }

  /**
   * Autorisation minimale : tant qu'aucun `RolesGuard` (modèle `Role`) n'est
   * branché, un utilisateur ne peut agir que sur son propre compte.
   */
  private _assertSelf(id: number, request: IRequestWithPayload): void {
    if (id !== request.user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez agir que sur votre propre compte.',
      );
    }
  }
}
