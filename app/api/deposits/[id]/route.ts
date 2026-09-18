import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, fail, handleApiError, rateLimit } from '@/lib/server/http';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!rateLimit(req, 'deposit:bank:status')) return fail('Too many requests.', 429, 'RATE_LIMITED');
    const user = await requireUser(req);
    const { id } = await params;
    const snap = await adminDb().collection('deposits').doc(id).get();
    if (!snap.exists || snap.data()?.userId !== user.uid) return fail('Không tìm thấy giao dịch.', 404, 'NOT_FOUND');
    const d = snap.data()!;
    return ok({
      id: snap.id,
      amount: Number(d.amount || 0),
      code: String(d.paymentCode || ''),
      status: String(d.status || 'pending'),
      providerReference: d.providerReference || null,
      processedAt: d.processedAt || null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
