import { Controller, Get, Header } from '@nestjs/common';

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
