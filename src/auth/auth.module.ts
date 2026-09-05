import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    UserModule,
    JwtModule.register({
      global: true,
      signOptions: { algorithm: 'HS512' },
      // secret: process.env.JWT_SECRET,
      // signOptions: { expiresIn: '3d'},
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
