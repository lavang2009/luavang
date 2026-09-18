import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { handleApiError, ok } from '@/lib/server/http';
import { checkoutWallet } from '@/services/order/checkout';

const schema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).max(128),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(20),
  voucherCode: z.string().trim().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = schema.parse(await request.json());
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;
    const result = await checkoutWallet(user.uid, body.items, body.voucherCode, idempotencyKey);
    return ok(result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
