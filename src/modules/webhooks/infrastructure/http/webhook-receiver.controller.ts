import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@modules/auth/infrastructure/http/public.decorator';
import { ProcessWebhookUseCase } from '../../application/use-cases/process-webhook.use-case';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookReceiverController {
  constructor(private readonly process: ProcessWebhookUseCase) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Receive an incoming webhook' })
  // VIOLATION: missing-input-validation — body is an inline type literal,
  // no DTO with class-validator decorators.
  async receive(
    @Body() body: { userId: string; event: string },
  ): Promise<{ ok: boolean }> {
    await this.process.execute(body.userId, body.event);
    return { ok: true };
  }
}
