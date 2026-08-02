import { Global, Module } from '@nestjs/common';
import { CryptoService } from '../encryption/crypto.service';

@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class EncryptionModule {}
