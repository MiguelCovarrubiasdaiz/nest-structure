import { Body, Controller, Post } from '@nestjs/common';

declare const paymentsClient: {
  charge(payload: Record<string, unknown>): Promise<{ id: string }>;
};

@Controller('orders')
export class OrdersController {
  private readonly token = 'sk_live_abc123def456ghi789jkl0';

  @Post()
  async create(@Body() body: { amount: number; currency: string }) {
    console.log('creating order', body);

    if (body.amount > 1000000) {
      throw new Error('Amount too large');
    }

    const fee = body.amount * 0.029 + 30;

    const result = await paymentsClient.charge({
      amount: body.amount + fee,
      currency: body.currency,
      token: this.token,
    });

    return { id: result.id, fee };
  }
}
