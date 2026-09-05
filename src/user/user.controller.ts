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
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '../../prisma/generated/prisma/client';
import { UserWithoutPass } from './interface/partielUser';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import type { Request } from 'express';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

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
  ): Promise<UserWithoutPass> {
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

  @Delete('account')
  @HttpCode(204)
  async deleteMyAccount(@Req() request: IRequestWithPayload): Promise<void> {
    await this.userService.delete(request.user.id);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ data: null; message: string }> {
    await this.userService.delete(id);
    return {
      data: null,
      message: `Le user avec l'id ${id} a été supprimé avec succès.`,
    };
  }

  @Delete()
  async deleteAll(): Promise<Prisma.BatchPayload> {
    return this.userService.deleteAll();
  }
}
