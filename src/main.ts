import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './utils/exceptions/prisma.filter';
import { HttpExceptionFilter } from './utils/exceptions/http.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
      // Origine de prod : même variable que le lien de reset password
      // (voir auth.controller.ts), pas de valeur en dur ici.
      const prodOrigin = process.env.FRONTEND_URL;

      if (
        !origin ||
        localOriginPattern.test(origin) ||
        (prodOrigin && origin === prodOrigin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
