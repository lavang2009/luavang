import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

const deleteSchema = z.object({ productId: z.string().min(1).max(128) });

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await adminDb().collection('products').where('category', '==', 'file').limit(300).get();
    return ok(snap.docs.map(d => {
      const x = d.data();
      return {
        id: d.id,
        name: x.name,
        status: x.status,
        hasFile: Boolean(x.fileStoragePath),
        contentType: x.fileStorageContentType || null,
        size: Number(x.fileStorageSize || 0),
        updatedAt: x.updatedAt || null,
        downloadCount: Number(x.downloadCount || 0),
      };
    }));
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
    let oldPath = '';

    await db.runTransaction(async tx => {
      const product = await tx.get(productRef);
      if (!product.exists || product.data()?.category !== 'file') throw new Error('NOT_FOUND');
      oldPath = String(product.data()?.fileStoragePath || '');
      if (!oldPath) throw new Error('FILE_NOT_READY');
      tx.update(productRef, {
        fileStoragePath: FieldValue.delete(),
        fileStorageContentType: FieldValue.delete(),
        fileStorageSize: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await adminStorage().bucket().file(oldPath).delete().catch(() => {});
    return ok({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
