import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { ok, fail, handleApiError } from '@/lib/server/http';
import { MAX_FILE_SIZE, isAllowedFile } from '@/lib/server/file-upload';
import { FieldValue } from 'firebase-admin/firestore';

const schema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { uploadId } = schema.parse(await req.json());

    const uploadRef = adminDb().collection('fileUploads').doc(uploadId);
    const uploadSnap = await uploadRef.get();

    if (!uploadSnap.exists) return fail('Upload không tồn tại.', 404, 'UPLOAD_NOT_FOUND');

    const upload = uploadSnap.data()!;
    if (upload.adminUid !== admin.uid) return fail('Forbidden', 403, 'FORBIDDEN');
    if (upload.status !== 'pending') return fail('Upload đã được xử lý.', 409, 'UPLOAD_NOT_READY');

    const expiresAt = upload.expiresAt?.toDate ? upload.expiresAt.toDate().getTime() : 0;
    if (expiresAt && expiresAt < Date.now()) {
      await uploadRef.set({ status: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return fail('Upload đã hết hạn.', 410, 'UPLOAD_EXPIRED');
    }

    if (!isAllowedFile(String(upload.requestedFileName), String(upload.contentType || ''))) {
      return fail('Loại file không được phép.', 415, 'FILE_TYPE_NOT_ALLOWED');
    }

    const fileRef = adminStorage().bucket().file(String(upload.storagePath));
    const [exists] = await fileRef.exists();
    if (!exists) return fail('File chưa được upload.', 400, 'UPLOAD_NOT_READY');

    const [metadata] = await fileRef.getMetadata();
    const size = Number(metadata.size || 0);
    const contentType = String(metadata.contentType || 'application/octet-stream');

    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
      await fileRef.delete().catch(() => {});
      return fail('Kích thước file không hợp lệ.', 413, 'FILE_SIZE_TOO_LARGE');
    }

    if (upload.requestedSize && Number(upload.requestedSize) !== size) {
      await fileRef.delete().catch(() => {});
      await uploadRef.set({ status: 'invalid', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return fail('Kích thước file không khớp.', 400, 'INVALID_UPLOAD');
    }

    const productRef = adminDb().collection('products').doc(String(upload.productId));
    const product = await productRef.get();
    if (!product.exists || product.data()?.category !== 'file') {
      await fileRef.delete().catch(() => {});
      return fail('Sản phẩm FILE không hợp lệ.', 404, 'NOT_FOUND');
    }

    const oldPath = product.data()?.fileStoragePath;
    await productRef.set({
      fileStoragePath: upload.storagePath,
      fileStorageContentType: contentType,
      fileStorageSize: size,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await uploadRef.set({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (oldPath && oldPath !== upload.storagePath) {
      await adminStorage().bucket().file(String(oldPath)).delete().catch(() => {});
    }

    return ok({
      committed: true,
      productId: upload.productId,
      size,
      contentType,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
