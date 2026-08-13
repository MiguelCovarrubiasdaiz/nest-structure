import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_SERVICE } from '@shared/storage/storage.tokens';
import type { StorageService } from '@shared/storage/ports/storage.service';

@Injectable()
export class GetSignedUrlUseCase {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async execute(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.storage.getSignedUrl(key, expiresInSeconds);
  }
}
