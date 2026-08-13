export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface StorageObject {
  key: string;
  url: string;
}

export interface StorageService {
  put(input: PutObjectInput): Promise<StorageObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
