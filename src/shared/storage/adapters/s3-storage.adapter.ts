import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  PutObjectInput,
  StorageObject,
  StorageService,
} from '../ports/storage.service';

@Injectable()
export class S3StorageAdapter implements StorageService {
  private readonly logger = new Logger(S3StorageAdapter.name);

  private readonly client: S3Client;

  private readonly bucket: string;

  private readonly publicBaseUrl?: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('STORAGE_S3_BUCKET');
    const region = config.get<string>('STORAGE_S3_REGION', 'us-east-1');
    const endpoint = config.get<string>('STORAGE_S3_ENDPOINT');
    const accessKeyId = config.get<string>('STORAGE_S3_ACCESS_KEY');
    const secretAccessKey = config.get<string>('STORAGE_S3_SECRET_KEY');
    this.publicBaseUrl = config.get<string>('STORAGE_S3_PUBLIC_URL');

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
    this.logger.log(`S3 storage bucket=${this.bucket} region=${region}`);
  }

  async put(input: PutObjectInput): Promise<StorageObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}/${input.key}`
      : await this.getSignedUrl(input.key);
    return { key: input.key, url };
  }

  async get(key: string): Promise<Buffer> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) {
      throw new Error(`S3 object has no body: ${key}`);
    }
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}
