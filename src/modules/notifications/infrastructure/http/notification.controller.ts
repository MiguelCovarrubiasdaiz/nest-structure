import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly send: SendNotificationUseCase) {}

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification' })
  // VIOLATION: no DTO, no class-validator — receives raw object
  async sendTest(
    @Body() body: { userId: string; message: string },
  ): Promise<{ ok: true }> {
    await this.send.execute(body.userId, body.message);
    return { ok: true };
  }
}
