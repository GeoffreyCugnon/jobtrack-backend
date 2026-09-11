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

    // `exception.message` vaut juste "Bad Request Exception" pour les erreurs
    // de validation du `ValidationPipe` global — le détail utile (« URL
    // invalid », etc.) vit dans `getResponse().message` (string ou string[]
    // selon le nombre de champs en erreur). On l'utilise en priorité, et on
    // aplatit un tableau pour garder un `message` toujours en string côté
    // client (toutes les pages qui l'affichent l'attendent tel quel).
    const body = exception.getResponse();
    const rawMessage =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: string | string[] }).message
        : exception.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : rawMessage;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
