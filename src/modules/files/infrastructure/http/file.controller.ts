import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { GetSignedUrlUseCase } from '../../application/use-cases/get-signed-url.use-case';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly getSignedUrl: GetSignedUrlUseCase,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.uploadFile.execute({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }

  @Get(':key/signed-url')
  @ApiOperation({ summary: 'Generate a signed URL for a stored file' })
  async signed(
    @Param('key') key: string,
    @Query('expiresIn') expiresIn?: string,
  ): Promise<{ url: string }> {
    const seconds = expiresIn ? Number(expiresIn) : undefined;
    const url = await this.getSignedUrl.execute(key, seconds);
    return { url };
  }
}