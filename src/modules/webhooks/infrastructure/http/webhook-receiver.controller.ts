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
import { ReceiveWebhookDto } from '../../application/dtos/receive-webhook.dto';
import { ProcessWebhookUseCase } from '../../application/use-cases/process-webhook.use-case';

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
      await this.process.execute(body);
    } catch (err) {
      this.logger.error(
        `Webhook processing failed for user ${body.userId}: ${(err as Error).message}`,
      );
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { ok: true };
  }
}
