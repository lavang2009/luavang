import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(1000),
  type: z.enum(['system', 'promotion', 'maintenance']).default('system'),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await adminDb().collection('systemAnnouncements').orderBy('createdAt', 'desc').limit(100).get();
    return ok(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = schema.parse(await req.json());
    const ref = adminDb().collection('systemAnnouncements').doc();
    await ref.set({
      title: body.title,
      message: body.message,
      type: body.type,
      active: true,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ok({ id: ref.id }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req:NextRequest){try{await requireAdmin(req);const b=z.object({id:z.string().min(1).max(128),active:z.boolean()}).parse(await req.json());const ref=adminDb().collection('systemAnnouncements').doc(b.id);const snap=await ref.get();if(!snap.exists)throw new Error('NOT_FOUND');await ref.set({active:b.active,updatedAt:FieldValue.serverTimestamp()},{merge:true});return ok({updated:true})}catch(e){return handleApiError(e)}}
