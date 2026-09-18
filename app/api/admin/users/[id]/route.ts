import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

const schema = z.object({
  status: z.enum(['active', 'blocked']).optional(),
  admin: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await params;
    const body = schema.parse(await req.json());

    if (id === actor.uid && (body.admin === false || body.status === 'blocked')) {
      throw new Error('NOT_ALLOWED');
    }

    const target = await adminAuth().getUser(id);
    const existingClaims = target.customClaims || {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status) {
      await adminAuth().updateUser(id, { disabled: body.status === 'blocked' });
      patch.status = body.status;
    }

    if (body.admin !== undefined) {
      await adminAuth().setCustomUserClaims(id, { ...existingClaims, admin: body.admin });
      patch.role = body.admin ? 'admin' : 'user';
    }

    await adminDb().collection('users').doc(id).set(patch, { merge: true });
    return ok({ updated: true });
  } catch (e) {
    return handleApiError(e);
  }
}
