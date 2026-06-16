import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { STORAGE_SERVICE } from './storage.tokens';
import type { StorageService } from './ports/storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService => {
        const driver = config.get<string>('STORAGE_DRIVER', 'local');
        Logger.log(`Storage driver: ${driver}`, 'StorageModule');
        switch (driver) {
          case 's3':
            return new S3StorageAdapter(config);
          case 'local':
            return new LocalStorageAdapter(config);
          default:
            throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
        }
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}