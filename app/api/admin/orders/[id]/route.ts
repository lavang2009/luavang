import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

const schema = z.object({
  action: z.enum(['cancel', 'refund']),
  reason: z.string().trim().min(3).max(500),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = schema.parse(await req.json());
    const db = adminDb();
    const ref = db.collection('orders').doc(id);

    await db.runTransaction(async tx => {
      const order = await tx.get(ref);
      if (!order.exists) throw new Error('NOT_FOUND');

      const o = order.data()!;
      if (o.status === 'refunded' || o.status === 'cancelled') throw new Error('ALREADY_FINAL');

      if (body.action === 'cancel') {
        if (!['pending', 'processing'].includes(String(o.status))) {
          throw new Error('NOT_ALLOWED');
        }

        tx.update(ref, {
          status: 'cancelled',
          cancelledBy: admin.uid,
          adminReason: body.reason,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      if (o.status !== 'completed') throw new Error('NOT_ALLOWED');

      const userRef = db.collection('users').doc(o.userId);
      const user = await tx.get(userRef);
      if (!user.exists) throw new Error('USER_NOT_FOUND');

      const amount = Number(o.total || 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('NOT_ALLOWED');

      tx.update(userRef, {
        balance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(ref, {
        status: 'refunded',
        refundedBy: admin.uid,
        refundAmount: amount,
        adminReason: body.reason,
        refundedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(userRef.collection('transactions').doc(), {
        type: 'refund',
        amount,
        orderId: id,
        adminUid: admin.uid,
        reason: body.reason,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(userRef.collection('notifications').doc(), {
        type: 'refund',
        title: 'Đơn hàng được hoàn tiền',
        message: `Đơn #${id} đã được hoàn ${amount.toLocaleString('vi-VN')} VNĐ.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return ok({ updated: true });
  } catch (e) {
    return handleApiError(e);
  }
}
