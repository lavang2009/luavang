import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { ok, fail, handleApiError, rateLimit } from '@/lib/server/http';
import { isAllowedFile, isSafeContentType, MAX_FILE_SIZE, sanitizeFileName } from '@/lib/server/file-upload';

const schema = z.object({
  productId: z.string().min(1).max(128),
  fileName: z.string().min(1).max(180),
  contentType: z.string().max(180).default('application/octet-stream'),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'admin:file-upload-url')) {
      return fail('Too many requests.', 429, 'RATE_LIMITED');
    }

    const admin = await requireAdmin(req);
    const body = schema.parse(await req.json());

    if (!isSafeContentType(body.contentType) || !isAllowedFile(body.fileName, body.contentType)) {
      return fail('Loại file không được phép.', 415, 'FILE_TYPE_NOT_ALLOWED');
    }

    const productRef = adminDb().collection('products').doc(body.productId);
    const product = await productRef.get();

    if (!product.exists || product.data()?.category !== 'file') {
      return fail('Sản phẩm FILE không hợp lệ.', 404, 'NOT_FOUND');
    }

    const safe = sanitizeFileName(body.fileName);
    const uploadId = crypto.randomUUID();
    const storagePath = `products/${body.productId}/${uploadId}-${safe.name}`;
    const uploadRef = adminDb().collection('fileUploads').doc(uploadId);

    const [uploadUrl] = await adminStorage().bucket().file(storagePath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: body.contentType || 'application/octet-stream',
    });

    await uploadRef.set({
      uploadId,
      productId: body.productId,
      adminUid: admin.uid,
      storagePath,
      requestedFileName: safe.name,
      contentType: body.contentType,
      requestedSize: body.size,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: FieldValue.serverTimestamp(),
    });

    return ok({
      uploadId,
      storagePath,
      uploadUrl,
      expiresInSeconds: 900,
    }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
