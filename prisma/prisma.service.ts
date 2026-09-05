import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    // Try to initialize the MariaDB adapter; if it fails (compatibility issues),
    // fall back to the default PrismaClient so the app can start in dev.
    try {
      // Use dynamic require to avoid TypeScript build-time errors if the adapter
      // exports change or are not available at runtime.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
      const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
      // Pass adapter to PrismaClient options
      // @ts-ignore - adapter typing may differ between versions
      super({ adapter });
    } catch (e) {
      // If adapter initialization fails, fall back to a plain PrismaClient.
      // This allows the server to start for development and debugging.
      // Log the error to help debugging.
      // eslint-disable-next-line no-console
      console.warn(
        'Prisma MariaDB adapter init failed, falling back to default PrismaClient:',
        e?.message ?? e,
      );
      // Provide an empty options object cast to any to satisfy the generated PrismaClient signature.
      // This keeps a safe fallback while avoiding TypeScript errors.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      super({} as any);
    }
  }
}
