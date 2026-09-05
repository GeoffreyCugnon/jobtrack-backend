import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

import { ConfigModule } from '@nestjs/config';
import { CompanyModule } from './company/company.module';
import { ApplicationModule } from './application/application.module';
import { CommentModule } from './comment/comment.module';
import { ContactModule } from './contact/contact.module';

import { EmploymentModule } from './employment/employment.module';
import { InterviewModule } from './interview/interview.module';
import { JobOfferingModule } from './job_offering/job_offering.module';
import { MessageModule } from './message/message.module';
import { NotificationModule } from './notification/notification.module';
import { SkillModule } from './skill/skill.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConnectionModule } from './connection/connection.module';
import { DocumentModule } from './document/document.module';
import { PublicationModule } from './publication/publication.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    CompanyModule,
    ApplicationModule,
    CommentModule,
    ContactModule,
    EmploymentModule,
    InterviewModule,
    JobOfferingModule,
    MessageModule,
    NotificationModule,
    SkillModule,
    ConnectionModule,
    DocumentModule,
    PublicationModule,
    RoleModule,
    AuthModule,
  ],
})
export class AppModule {}
