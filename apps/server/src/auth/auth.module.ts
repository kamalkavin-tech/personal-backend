import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { User, UserSchema } from './schemas/user.schema';
import { Device, DeviceSchema } from './schemas/device.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthEvent, AuthEventSchema } from './schemas/auth-event.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Session.name, schema: SessionSchema },
      { name: AuthEvent.name, schema: AuthEventSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, TokenService, MongooseModule],
})
export class AuthModule {}
