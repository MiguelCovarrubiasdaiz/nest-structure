import { ApiProperty } from '@nestjs/swagger';
import type { StorageObject } from '@shared/storage/ports/storage.service';

export class FileResponse {
  @ApiProperty({ example: '2026/1f0c….jpg' }) key!: string;

  @ApiProperty({ example: '/files/2026/1f0c….jpg' }) url!: string;

  static fromStorage(object: StorageObject): FileResponse {
    return { key: object.key, url: object.url };
  }
}
