import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

function toMillis(value: unknown): number {
  return value && typeof (value as { toMillis?: () => number }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : 0;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const [bank, card] = await Promise.all([
      db.collection('deposits').orderBy('createdAt', 'desc').limit(200).get(),
      db.collection('cardDeposits').orderBy('createdAt', 'desc').limit(200).get()
    ]);

    const rows = [
      ...bank.docs.map(d => ({ id: d.id, method: 'sepay', ...d.data() })),
      ...card.docs.map(d => ({ id: d.id, method: 'nappay', ...d.data() }))
    ]
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 300);

    return ok(rows);
  } catch (e) {
    return handleApiError(e);
  }
}
