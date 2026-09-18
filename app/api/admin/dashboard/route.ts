import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();

    const [users, products, orders, bankDeposits, cardDeposits] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('products').count().get(),
      db.collection('orders').count().get(),
      db.collection('deposits').where('status', '==', 'success').count().get(),
      db.collection('cardDeposits').where('status', '==', 'success').count().get()
    ]);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const [weekOrders, weekBankDeposits, weekCardDeposits] = await Promise.all([
      db.collection('orders').where('createdAt', '>=', start).limit(1000).get(),
      db.collection('deposits').where('createdAt', '>=', start).where('status', '==', 'success').limit(1000).get(),
      db.collection('cardDeposits').where('createdAt', '>=', start).where('status', '==', 'success').limit(1000).get()
    ]);

    const revenue = Array.from({ length: 7 }, () => 0);
    const orderSeries = Array.from({ length: 7 }, () => 0);
    const depositSeries = Array.from({ length: 7 }, () => 0);

    const bucket = (date: Date) => Math.min(6, Math.max(0, Math.floor((date.getTime() - start.getTime()) / 86400000)));

    for (const d of weekOrders.docs) {
      const ts = toDate(d.data().createdAt);
      if (ts) {
        const idx = bucket(ts);
        revenue[idx] += Number(d.data().total || 0);
        orderSeries[idx] += 1;
      }
    }

    for (const d of [...weekBankDeposits.docs, ...weekCardDeposits.docs]) {
      const ts = toDate(d.data().createdAt);
      if (ts) {
        depositSeries[bucket(ts)] += Number(d.data().amount || d.data().actualAmount || 0);
      }
    }

    return ok({
      users: users.data().count,
      products: products.data().count,
      orders: orders.data().count,
      successfulDeposits: bankDeposits.data().count + cardDeposits.data().count,
      series: { revenue, orders: orderSeries, deposits: depositSeries }
    });
  } catch (e) {
    return handleApiError(e);
  }
}
