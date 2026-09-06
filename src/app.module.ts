import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

import { ConfigModule } from '@nestjs/config';
import { CompanyModule } from './company/company.module';
import { ConnectionModule } from './connection/connection.module';
import { JobOfferingModule } from './job_offering/job_offering.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicationModule } from './publication/publication.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';

/**
 * Seuls les modules réellement implémentés sont montés. Les modules encore au
 * stade du scaffold `nest g resource` (application, comment, contact, document,
 * employment, interview, message, skill) ont été retirés : leurs endpoints
 * renvoyaient des chaînes factices (« This action returns all … ») en 200. Les
 * régénérer avec `nest g resource <nom>` au moment de les implémenter, puis les
 * rajouter ici.
 */
@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    CompanyModule,
    ConnectionModule,
    JobOfferingModule,
    NotificationModule,
    PublicationModule,
    RoleModule,
    AuthModule,
  ],
})
export class AppModule {}
