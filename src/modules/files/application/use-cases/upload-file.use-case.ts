import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_SERVICE } from '@shared/storage/storage.tokens';
import type {
  StorageObject,
  StorageService,
} from '@shared/storage/ports/storage.service';

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

@Injectable()
export class UploadFileUseCase {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  async execute(input: UploadFileInput): Promise<StorageObject> {
    const key = `${new Date().getFullYear()}/${randomUUID()}${extname(input.originalName)}`;
    return this.storage.put({
      key,
      body: input.buffer,
      contentType: input.mimeType,
    });
  }
}