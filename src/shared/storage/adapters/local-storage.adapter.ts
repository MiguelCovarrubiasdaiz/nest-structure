import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type {
  PutObjectInput,
  StorageObject,
  StorageService,
} from '../ports/storage.service';

@Injectable()
export class LocalStorageAdapter implements StorageService {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('STORAGE_LOCAL_PATH', './uploads'));
    this.publicBaseUrl = config.get<string>('STORAGE_LOCAL_PUBLIC_URL', '/files');
    this.logger.log(`Local storage at ${this.root}`);
  }

  private pathFor(key: string): string {
    return join(this.root, key);
  }

  async put(input: PutObjectInput): Promise<StorageObject> {
    const path = this.pathFor(input.key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, input.body);
    return { key: input.key, url: `${this.publicBaseUrl}/${input.key}` };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.pathFor(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return `${this.publicBaseUrl}/${key}`;
  }
}