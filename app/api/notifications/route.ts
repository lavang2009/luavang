import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';

const schema = z.object({ id: z.string().min(1).max(180) });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const db = adminDb();
    const [personal, announcements, reads] = await Promise.all([
      db.collection('users').doc(user.uid).collection('notifications').orderBy('createdAt', 'desc').limit(80).get(),
      db.collection('systemAnnouncements').where('active', '==', true).orderBy('createdAt', 'desc').limit(50).get(),
      db.collection('users').doc(user.uid).collection('notificationReads').orderBy('createdAt', 'desc').limit(200).get(),
    ]);
    const readSet = new Set(reads.docs.map(d => d.id));
    const privateRows = personal.docs.map(d => ({ id: d.id, ...d.data() }));
    const globalRows = announcements.docs.map(d => ({
      id: `system_${d.id}`,
      title: d.data().title,
      message: d.data().message,
      type: d.data().type,
      read: readSet.has(d.id),
      createdAt: d.data().createdAt,
      scope: 'system',
    }));
    return ok([...privateRows, ...globalRows].sort((a, b) => {
      const am = a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (a.createdAt as { toMillis: () => number }).toMillis() : 0;
      const bm = b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (b.createdAt as { toMillis: () => number }).toMillis() : 0;
      return bm - am;
    }).slice(0, 100));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const b = schema.parse(await req.json());
    const db = adminDb();
    if (b.id.startsWith('system_')) {
      const announcementId = b.id.slice(7);
      const announcement = await db.collection('systemAnnouncements').doc(announcementId).get();
      if (!announcement.exists) throw new Error('NOT_FOUND');
      await db.collection('users').doc(user.uid).collection('notificationReads').doc(announcementId).set({ read: true, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      await db.collection('users').doc(user.uid).collection('notifications').doc(b.id).set({ read: true }, { merge: true });
    }
    return ok({ updated: true });
  } catch (e) {
    return handleApiError(e);
  }
}
