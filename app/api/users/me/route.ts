import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { ok, fail, handleApiError } from '@/lib/server/http';
import { safeImageUrl } from '@/lib/utils';

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(64).optional(),
  photoURL: z.string().url().refine(v => safeImageUrl(v) !== '', 'Ảnh đại diện phải là HTTPS.').nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const snap = await adminDb().collection('users').doc(user.uid).get();
    if (!snap.exists) return fail('Tài khoản chưa được khởi tạo.', 404, 'USER_NOT_FOUND');
    return ok({ uid: user.uid, ...snap.data() });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = patchSchema.parse(await req.json());
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.displayName !== undefined) updates.displayName = body.displayName;
    if (body.photoURL !== undefined) updates.photoURL = body.photoURL || '';

    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (body.displayName !== undefined) authUpdates.displayName = body.displayName;
    if (body.photoURL !== undefined) authUpdates.photoURL = body.photoURL || '';

    if (Object.keys(authUpdates).length) await adminAuth().updateUser(user.uid, authUpdates);
    await adminDb().collection('users').doc(user.uid).set(updates, { merge: true });

    return ok({ updated: true });
  } catch (e) {
    return handleApiError(e);
  }
}
