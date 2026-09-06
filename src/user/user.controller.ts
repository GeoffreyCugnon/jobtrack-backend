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
import { UserWithoutPass } from './interface/partielUser';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import type { Request } from 'express';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('profil')
  async getMyProfil(
    @Req() request: IRequestWithPayload,
  ): Promise<UserWithoutPass> {
    return await this.userService.findOneOrThrow(request.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserWithoutPass> {
    return this.userService.findOneOrThrow(id);
  }

  @Get()
  async findAll(): Promise<UserWithoutPass[]> {
    return await this.userService.findAll();
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Req() request: IRequestWithPayload,
  ): Promise<UserWithoutPass> {
    this._assertSelf(id, request);
    return await this.userService.update(id, body);
  }

  @Patch('settings/notifications')
  async updateNotifications(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateNotificationsDto,
  ): Promise<UserWithoutPass> {
    return await this.userService.update(request.user.id, body);
  }

  @Patch('settings/language')
  async updateLanguage(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateLanguageDto,
  ): Promise<UserWithoutPass> {
    return await this.userService.update(request.user.id, body);
  }

  @Patch('avatar')
  async updateAvatar(
    @Req() request: IRequestWithPayload,
    @Body() body: UpdateAvatarDto,
  ): Promise<UserWithoutPass> {
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
