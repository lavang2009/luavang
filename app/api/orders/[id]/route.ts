import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, fail, handleApiError } from '@/lib/server/http';
import { decryptSecret } from '@/lib/server/crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const snap = await adminDb().collection('orders').doc(id).get();

    if (!snap.exists) return fail('Không tìm thấy đơn hàng.', 404, 'NOT_FOUND');

    const data = snap.data()!;
    if (data.userId !== user.uid && !user.admin) {
      return fail('Forbidden', 403, 'FORBIDDEN');
    }

    const deliveryQuery = adminDb().collection('orderDeliveries').where('orderId', '==', id);
    const deliveries = await deliveryQuery.get();

    return ok({
      id: snap.id,
      ...data,
      deliveries: user.admin || data.userId === user.uid
        ? deliveries.docs.map(d => {
            const x = d.data();
            if (x.kind === 'acc' && x.secretEnc && data.userId === user.uid) {
              const secret = JSON.parse(decryptSecret(String(x.secretEnc)));
              return {
                orderId: x.orderId,
                productId: x.productId,
                itemId: x.itemId,
                kind: 'acc',
                username: secret.username,
                password: secret.password,
                note: secret.note,
              };
            }
            return {
              orderId: x.orderId,
              productId: x.productId,
              itemId: x.itemId,
              kind: x.kind,
            };
          })
        : [],
    });
  } catch (e) {
    return handleApiError(e);
  }
}
