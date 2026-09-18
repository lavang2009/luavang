import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const db = adminDb();
    const [products, orders, users] = await Promise.all([
      db.collection('products').where('status', '==', 'active').count().get(),
      db.collection('orders').where('status', '==', 'completed').count().get(),
      db.collection('users').count().get(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        activeProducts: products.data().count,
        completedOrders: orders.data().count,
        registeredUsers: users.data().count,
        availability: '24/7',
      },
    }, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'STATS_FAILED', message: 'Không thể tải thống kê.' } }, { status: 500 });
  }
}
