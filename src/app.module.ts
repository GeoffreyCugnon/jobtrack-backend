import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './application/application.module';
import { CommentModule } from './comment/comment.module';
import { CompanyModule } from './company/company.module';
import { ConnectionModule } from './connection/connection.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentModule } from './document/document.module';
import { InterviewModule } from './interview/interview.module';
import { JobCategoryModule } from './job_category/job_category.module';
import { JobOfferingModule } from './job_offering/job_offering.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicationModule } from './publication/publication.module';
import { RoleModule } from './role/role.module';
import { SkillModule } from './skill/skill.module';
import { AuthModule } from './auth/auth.module';

/**
 * Seuls les modules réellement implémentés sont montés. Les modules encore au
 * stade du scaffold `nest g resource` (contact, employment, message)
 * restent hors de l'app : leurs endpoints renverraient des chaînes factices.
 * `application`, `comment`, `dashboard`, `document` et `interview` ont été
 * (ré)implémentés (câblage Front des pages Candidatures / Entretiens /
 * Documents / commentaires d'actu / tuiles du tableau de bord).
 * `company` est remonté pour la page Frontend « Créer une entreprise »
 * (`POST /company`, protégé par `AuthGuard`). Limite connue : pas de vérif
 * de propriété sur `PATCH`/`DELETE /company/:id` (n'importe quel utilisateur
 * connecté peut modifier/supprimer n'importe quelle entreprise, `DELETE`
 * cascade sur ses offres) et création d'entreprise non reliée à un
 * `Employment`/rôle `CEO` pour l'appelant — à traiter avec un `RolesGuard`
 * dédié si le besoin devient réel (même état que `role`, cf. `Backend/CLAUDE.md`).
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
    CompanyModule,
    ConnectionModule,
    DashboardModule,
    DocumentModule,
    InterviewModule,
    JobCategoryModule,
    JobOfferingModule,
    NotificationModule,
    PublicationModule,
    RoleModule,
    SkillModule,
    AuthModule,
  ],
})
export class AppModule {}
