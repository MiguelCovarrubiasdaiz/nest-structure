import { Module } from '@nestjs/common';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { GetSignedUrlUseCase } from './application/use-cases/get-signed-url.use-case';
import { FileController } from './infrastructure/http/file.controller';

@Module({
  controllers: [FileController],
  providers: [UploadFileUseCase, GetSignedUrlUseCase],
})
export class FilesModule {}