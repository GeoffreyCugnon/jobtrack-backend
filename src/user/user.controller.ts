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
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser } from './interface/safe-user';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profil')
  async getMyProfil(@Req() request: IRequestWithPayload): Promise<SafeUser> {
    return await this.userService.findOneSafeOrThrow(request.user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.userService.findOneSafeOrThrow(id);
  }

  @Get()
  async findAll(): Promise<SafeUser[]> {
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

  @Patch('avatar')
  async updateAvatar(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateAvatarDto,
  ): Promise<SafeUser> {
    return await this.userService.update(request.user.id, {
      avatar_url: body.avatarUrl,
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
