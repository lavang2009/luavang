import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

export type ServerUser = { uid: string; email?: string; admin: boolean };

function bearer(request: NextRequest) {
  const raw = request.headers.get('authorization') || '';
  return raw.startsWith('Bearer ') ? raw.slice(7) : null;
}

export async function requireUser(request: NextRequest): Promise<ServerUser> {
  const token = bearer(request);
  if (!token) throw new Error('UNAUTHENTICATED');
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    const snap = await adminDb().collection('users').doc(decoded.uid).get();
    if (snap.exists && snap.data()?.status === 'blocked') throw new Error('ACCOUNT_BLOCKED');
    return { uid: decoded.uid, email: decoded.email, admin: decoded.admin === true };
  } catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_BLOCKED') throw error;
    throw new Error('UNAUTHENTICATED');
  }
}

export async function requireAdmin(request: NextRequest): Promise<ServerUser> {
  const user = await requireUser(request);
  if (!user.admin) throw new Error('FORBIDDEN');
  return user;
}

export async function ensureUserDocument(uid: string, profile?: { email?: string | null; displayName?: string | null; photoURL?: string | null; provider?: string }) {
  const ref = adminDb().collection('users').doc(uid);
  const authUser = await adminAuth().getUser(uid);
  const verifiedProfile = {
    email: authUser.email || (profile && profile.email) || '',
    displayName: authUser.displayName || (profile && profile.displayName) || '',
    photoURL: authUser.photoURL || (profile && profile.photoURL) || '',
    provider: (authUser.providerData[0] && authUser.providerData[0].providerId) || (profile && profile.provider) || 'password'
  };
  const snap = await ref.get();
  const now = new Date();
  if (!snap.exists) {
    await ref.set({
      uid,
      username: verifiedProfile.displayName
        ? verifiedProfile.displayName.slice(0, 32)
        : (verifiedProfile.email ? verifiedProfile.email.split('@')[0].slice(0, 32) : `user_${uid.slice(0, 6)}`),
      displayName: verifiedProfile.displayName, email: verifiedProfile.email, photoURL: verifiedProfile.photoURL,
      provider: verifiedProfile.provider, role: 'user', balance: 0, totalSpent: 0, totalDeposited: 0,
      totalOrders: 0, status: 'active', createdAt: now, updatedAt: now, lastLoginAt: now
    });
  } else {
    await ref.set({ updatedAt: now, lastLoginAt: now }, { merge: true });
  }
}

export function errorStatus(err: unknown) {
  const code = err instanceof Error ? err.message : 'UNKNOWN';
  if (code === 'UNAUTHENTICATED') return 401;
  if (code === 'FORBIDDEN') return 403;
  return 400;
}
