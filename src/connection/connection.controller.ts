import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConnectionService } from './connection.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';
import { matchesETag } from '../utils/etag';

@UseGuards(AuthGuard)
@Controller('connection')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  async list(
    @Req() request: IRequestWithPayload,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = await this.connectionService.getListETag(request.user.id);
    if (matchesETag(ifNoneMatch, etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return;
    }
    response.setHeader('ETag', etag);
    return this.connectionService.list(request.user.id);
  }

  @Post()
  request(
    @Req() request: IRequestWithPayload,
    @Body() body: CreateConnectionDto,
  ) {
    return this.connectionService.request(request.user.id, body.userId);
  }

  @Patch(':userId/accept')
  accept(
    @Req() request: IRequestWithPayload,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.connectionService.accept(request.user.id, userId);
  }

  @Delete(':userId')
  remove(
    @Req() request: IRequestWithPayload,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.connectionService.remove(request.user.id, userId);
  }
}
