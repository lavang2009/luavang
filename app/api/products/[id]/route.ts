import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ok, fail } from '@/lib/server/http';
import { isoDate } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const snap = await adminDb().collection('products').doc(id).get();
    if (!snap.exists || !snap.data() || snap.data()!.status !== 'active') {
      return fail('Sản phẩm không tồn tại.', 404, 'NOT_FOUND');
    }

    const data = snap.data()!;
    const { fileStoragePath, ...publicData } = data;

    return ok({
      id: snap.id,
      ...publicData,
      createdAt: isoDate(publicData.createdAt),
      updatedAt: isoDate(publicData.updatedAt),
    });
  } catch {
    return fail('Không thể tải sản phẩm.', 500, 'PRODUCT_FETCH_FAILED');
  }
}
