import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Le serveur MySQL utilise l'auth `caching_sha2_password` sans TLS : sans ce
 * flag, le driver mariadb refuse de récupérer la clé publique RSA et aucune
 * connexion n'aboutit (`pool timeout ... active=0 idle=0`). Compromis dev/LAN
 * connu (un MITM pourrait substituer la clé) ; en prod, préférer TLS ou
 * `mysql_native_password`.
 */
function withPublicKeyRetrieval(url: string): string {
  if (!url || url.includes('allowPublicKeyRetrieval')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'allowPublicKeyRetrieval=true';
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaMariaDb(
        withPublicKeyRetrieval(process.env.DATABASE_URL as string),
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion à la base établie.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
