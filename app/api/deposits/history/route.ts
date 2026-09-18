import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

function toMillis(value: unknown): number {
  return value && typeof (value as { toMillis?: () => number }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis()
    : 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const db = adminDb();
    const [bank, card] = await Promise.all([
      db.collection('deposits').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('cardDeposits').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(100).get()
    ]);

    const rows = [
      ...bank.docs.map(d => ({ id: d.id, method: 'sepay', ...d.data() })),
      ...card.docs.map(d => ({ id: d.id, method: 'nappay', ...d.data() }))
    ]
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 150);

    return ok(rows);
  } catch (e) {
    return handleApiError(e);
  }
}
