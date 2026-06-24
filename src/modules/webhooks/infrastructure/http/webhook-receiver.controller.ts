import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@modules/auth/infrastructure/http/public.decorator';
import { ProcessWebhookCommand } from '../../application/commands/process-webhook.command';
import { ReceiveWebhookDto } from '../../application/dtos/receive-webhook.dto';
import { ProcessWebhookUseCase } from '../../application/use-cases/process-webhook.use-case';

const WEBHOOK_ERROR_STATUS = HttpStatus.INTERNAL_SERVER_ERROR;
const USER_ID_HASH_LENGTH = 12;

const obfuscateUserId = (userId: string): string =>
  createHash('sha256')
    .update(userId)
    .digest('hex')
    .slice(0, USER_ID_HASH_LENGTH);

const toCommand = (body: ReceiveWebhookDto): ProcessWebhookCommand => ({
  userId: body.userId,
  event: body.event,
});

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(private readonly process: ProcessWebhookUseCase) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Receive an incoming webhook' })
  async receive(@Body() body: ReceiveWebhookDto): Promise<{ ok: boolean }> {
    try {
      await this.process.execute(toCommand(body));
    } catch (err) {
      this.logger.error(
        `Webhook processing failed for user ${obfuscateUserId(body.userId)}: ${(err as Error).message}`,
      );
      throw new HttpException(
        'Webhook processing failed',
        WEBHOOK_ERROR_STATUS,
      );
    }
    return { ok: true };
  }
}
