import { NextRequest } from 'next/server';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { isoDate } from '@/lib/utils';
import { ok, fail } from '@/lib/server/http';

type Cursor = { createdAt: number; id: string };

function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    if (!Number.isFinite(decoded.createdAt) || !decoded.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: unknown, id: string): string | null {
  const millis = createdAt && typeof (createdAt as { toMillis?: () => number }).toMillis === 'function'
    ? (createdAt as { toMillis: () => number }).toMillis()
    : 0;
  if (!millis) return null;
  return Buffer.from(JSON.stringify({ createdAt: millis, id }), 'utf8').toString('base64url');
}

function publicProduct(id: string, data: Record<string, unknown>) {
  const { fileStoragePath, ...publicData } = data;
  return {
    id,
    ...publicData,
    createdAt: isoDate(publicData.createdAt),
    updatedAt: isoDate(publicData.updatedAt),
  };
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const category = sp.get('category');
    const idsParam = sp.get('ids');
    const withCursor = sp.get('withCursor') === '1';
    const cursor = decodeCursor(sp.get('cursor'));
    const requestedLimit = Number(sp.get('limit') || 24);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 24, 1), 48);
    const db = adminDb();

    if (idsParam) {
      const ids = [...new Set(idsParam.split(',').map(v => v.trim()).filter(Boolean))].slice(0, 30);
      if (!ids.length) return ok(withCursor ? { items: [], nextCursor: null } : []);
      const snaps = await Promise.all(ids.map(id => db.collection('products').doc(id).get()));
      const items = snaps
        .filter(s => s.exists)
        .map(d => publicProduct(d.id, d.data() || {}))
        .filter(item => item.status === 'active' && (!category || item.category === category));
      return ok(withCursor ? { items, nextCursor: null } : items);
    }

    let query = db.collection('products')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(limit);

    if (category) {
      query = db.collection('products')
        .where('status', '==', 'active')
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .orderBy(FieldPath.documentId(), 'desc')
        .limit(limit);
    }

    if (cursor) {
      query = query.startAfter(Timestamp.fromMillis(cursor.createdAt), cursor.id);
    }

    const snap = await query.get();
    const items = snap.docs.map(d => publicProduct(d.id, d.data()));
    const last = snap.docs.at(-1);
    const nextCursor = last ? encodeCursor(last.data().createdAt, last.id) : null;

    return ok(withCursor ? { items, nextCursor } : items);
  } catch {
    return fail('Không thể tải sản phẩm.', 500, 'PRODUCTS_FETCH_FAILED');
  }
}
