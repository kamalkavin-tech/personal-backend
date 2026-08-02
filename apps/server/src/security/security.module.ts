import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Device, DeviceSchema } from '../auth/schemas/device.schema';
import { Session, SessionSchema } from '../auth/schemas/session.schema';
import { AuthEvent, AuthEventSchema } from '../auth/schemas/auth-event.schema';
import { VaultEntry, VaultEntrySchema } from '../vault/schemas/vault-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Session.name, schema: SessionSchema },
      { name: AuthEvent.name, schema: AuthEventSchema },
      { name: VaultEntry.name, schema: VaultEntrySchema },
    ]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
