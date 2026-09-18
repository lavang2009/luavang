import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { createBankDeposit } from '@/services/payments/sepay';
import { ok, rateLimit, handleApiError, fail } from '@/lib/server/http';

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'deposit:bank')) return fail('Too many requests.', 429, 'RATE_LIMITED');
    const user = await requireUser(req);
    const body = z.object({
      amount: z.number().int().min(1000).max(50000000),
    }).parse(await req.json());

    return ok(await createBankDeposit(user.uid, body.amount), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
