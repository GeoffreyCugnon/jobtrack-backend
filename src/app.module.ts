import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './application/application.module';
import { CommentModule } from './comment/comment.module';
import { ConnectionModule } from './connection/connection.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentModule } from './document/document.module';
import { InterviewModule } from './interview/interview.module';
import { JobOfferingModule } from './job_offering/job_offering.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicationModule } from './publication/publication.module';
import { RoleModule } from './role/role.module';
import { SkillModule } from './skill/skill.module';
import { AuthModule } from './auth/auth.module';

/**
 * Seuls les modules réellement implémentés sont montés. Les modules encore au
 * stade du scaffold `nest g resource` (contact, employment, message)
 * restent hors de l'app : leurs endpoints renverraient des chaînes factices.
 * `company` est aussi hors app : CRUD réel mais aucune vérif de propriété
 * (DELETE cascaderait sur les offres) et non consommé par le Front — à
 * réactiver avec un `RolesGuard` (rôle `CEO`).
 * `application`, `comment`, `dashboard`, `document` et `interview` ont été
 * (ré)implémentés (câblage Front des pages Candidatures / Entretiens /
 * Documents / commentaires d'actu / tuiles du tableau de bord).
 */
@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    ApplicationModule,
    CommentModule,
    ConnectionModule,
    DashboardModule,
    DocumentModule,
    InterviewModule,
    JobOfferingModule,
    NotificationModule,
    PublicationModule,
    RoleModule,
    SkillModule,
    AuthModule,
  ],
})
export class AppModule {}
