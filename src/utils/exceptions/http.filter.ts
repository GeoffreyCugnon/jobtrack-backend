import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const line = `${request.method} ${request.url} -> ${status}`;

    // Les 4xx sont des erreurs client normales (401 sur /auth/refresh sans
    // cookie, 404, validation...) : `debug` pour ne pas polluer la console.
    // Seuls les 5xx méritent un `error`.
    if (status >= 500) {
      this.logger.error(line, JSON.stringify(exception.getResponse()));
    } else {
      this.logger.debug(line);
    }
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
