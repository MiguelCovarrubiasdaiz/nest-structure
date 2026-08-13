import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { InvalidStorageKeyException } from '../storage.exceptions';
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
    this.publicBaseUrl = config.get<string>(
      'STORAGE_LOCAL_PUBLIC_URL',
      '/files',
    );
    this.logger.log(`Local storage at ${this.root}`);
  }

  // Resolves a key to an absolute path, rejecting any key that would escape the
  // storage root (path traversal via "..", absolute paths, leading separators).
  private pathFor(key: string): string {
    const normalized = key.replace(/\\/g, '/');
    const escapes =
      isAbsolute(normalized) ||
      normalized.split('/').some((segment) => segment === '..');
    if (escapes) {
      throw new InvalidStorageKeyException(key);
    }
    const full = resolve(this.root, normalized);
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new InvalidStorageKeyException(key);
    }
    return full;
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

  // NOTE: the local driver has no signing — it returns the same permanent public
  // URL and ignores `expiresInSeconds`. Files are served statically from `root`
  // (see main.ts). Use the S3 driver for genuinely time-limited signed URLs.
  async getSignedUrl(key: string): Promise<string> {
    // Validate the key so a traversal attempt is rejected consistently.
    this.pathFor(key);
    return `${this.publicBaseUrl}/${key}`;
  }
}
