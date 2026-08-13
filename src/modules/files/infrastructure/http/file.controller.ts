import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FileResponse } from '../../application/dtos/file.response';
import { SignedUrlQueryDto } from '../../application/dtos/signed-url.query';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { GetSignedUrlUseCase } from '../../application/use-cases/get-signed-url.use-case';

// 10 MiB cap keeps a single upload from exhausting memory (multer buffers in RAM).
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

type MulterFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly getSignedUrl: GetSignedUrlUseCase,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (multipart, max 10 MiB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: MulterFileFilterCallback,
      ): void => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileResponse> {
    if (!file) throw new BadRequestException('file is required');
    const object = await this.uploadFile.execute({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    return FileResponse.fromStorage(object);
  }

  @Get('signed-url')
  @ApiOperation({ summary: 'Generate a signed URL for a stored file' })
  async signed(@Query() query: SignedUrlQueryDto): Promise<{ url: string }> {
    const url = await this.getSignedUrl.execute(query.key, query.expiresIn);
    return { url };
  }
}
