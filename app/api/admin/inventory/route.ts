import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { decryptSecret } from '@/lib/server/crypto';
import { importInventory } from '@/services/admin/inventory';
import { ok, fail, handleApiError } from '@/lib/server/http';

const createSchema = z.object({ productId: z.string().min(1).max(128), bulk: z.string().min(1).max(100000) });
const deleteSchema = z.object({ productId: z.string().min(1), itemId: z.string().min(1) });

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const productId = req.nextUrl.searchParams.get('productId');
    const status = req.nextUrl.searchParams.get('status');
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
    if (!productId) throw new Error('PRODUCT_REQUIRED');

    const product = await adminDb().collection('products').doc(productId).get();
    if (!product.exists || product.data()?.category !== 'acc') throw new Error('INVALID_ACC_PRODUCT');

    let query = adminDb().collection('products').doc(productId).collection('inventory').orderBy('createdAt', 'desc').limit(200);
    if (status && ['available', 'sold'].includes(status)) {
      query = adminDb().collection('products').doc(productId).collection('inventory')
        .where('status', '==', status).orderBy('createdAt', 'desc').limit(200);
    }

    const snap = await query.get();
    const rows = snap.docs.map(d => {
      const data = d.data();
      let username = '';
      let note = '';
      if (data.secretEnc) {
        try {
          const secret = JSON.parse(decryptSecret(String(data.secretEnc))) as { username?: string; note?: string };
          username = String(secret.username || '');
          note = String(secret.note || '');
        } catch {
          username = '[decrypt-error]';
        }
      }
      return { id: d.id, username, note, status: data.status, createdAt: data.createdAt, soldAt: data.soldAt || null };
    });

    return ok(q ? rows.filter(row => `${row.username} ${row.note}`.toLowerCase().includes(q)) : rows);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = createSchema.parse(await req.json());
    const rows = b.bulk.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const [username, password, ...note] = line.split('|');
      return { username: (username || '').trim(), password: (password || '').trim(), note: note.join('|').trim() };
    }).filter(x => x.username && x.password);
    return ok(await importInventory(b.productId, rows), 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = deleteSchema.parse(await req.json());
    const db = adminDb();
    const productRef = db.collection('products').doc(b.productId);
    const itemRef = productRef.collection('inventory').doc(b.itemId);

    await db.runTransaction(async tx => {
      const [product, item] = await Promise.all([tx.get(productRef), tx.get(itemRef)]);
      if (!product.exists || product.data()?.category !== 'acc') throw new Error('INVALID_ACC_PRODUCT');
      if (!item.exists) throw new Error('NOT_FOUND');
      const data = item.data()!;
      if (data.status === 'sold') throw new Error('NOT_ALLOWED');
      tx.delete(itemRef);
      tx.update(productRef, {
        inventoryCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return ok({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
