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
} from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { IRequestWithPayload } from '../auth/interface';

@UseGuards(AuthGuard)
@Controller('connection')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  list(@Req() request: IRequestWithPayload) {
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
