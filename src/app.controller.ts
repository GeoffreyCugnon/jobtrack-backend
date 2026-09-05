import { Controller, Get, Header, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Backend is running';
  }

  @Get('favicon.ico')
  @Header('Content-Type', 'image/x-icon')
  getFavicon(): string {
    return '';
  }
}
