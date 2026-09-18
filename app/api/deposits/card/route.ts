import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { encryptSecret } from '@/lib/server/crypto';
import { submitCard, verifyNappayResponse } from '@/services/payments/nappay';
import { ok, rateLimit, handleApiError, fail } from '@/lib/server/http';
import crypto from 'node:crypto';

const schema = z.object({
  telco: z.enum(['VIETTEL', 'VINAPHONE', 'MOBIFONE']),
  amount: z.number().int().positive(),
  serial: z.string().trim().min(5).max(64),
  code: z.string().trim().min(5).max(128),
});

async function hash(s: string) {
  return crypto.createHash('sha256').update(s.trim()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'deposit:card')) return fail('Too many requests.', 429, 'RATE_LIMITED');

    const user = await requireUser(req);
    const body = schema.parse(await req.json());
    const requestId = `LV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const serialHash = await hash(body.serial);
    const ref = adminDb().collection('cardDeposits').doc(requestId);

    const duplicate = await adminDb()
      .collection('cardDeposits')
      .where('serialHash', '==', serialHash)
      .limit(1)
      .get();

    if (!duplicate.empty) throw new Error('ALREADY_CREDITED');

    await ref.create({
      requestId,
      userId: user.uid,
      telco: body.telco,
      declaredAmount: body.amount,
      serialHash,
      credentialEnc: encryptSecret(JSON.stringify({ serial: body.serial, code: body.code })),
      status: 'processing',
      credited: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const provider = await submitCard({ requestId, ...body });

    if (!verifyNappayResponse(provider, body.code, body.serial)) {
      await ref.set({
        status: 'failed',
        providerMessage: 'Chữ ký phản hồi NAPPay không hợp lệ.',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      throw new Error('REQUEST_FAILED');
    }

    const verifiedFaceValue = Number(provider.value || 0);
    const actualCredit = Number(provider.amount || 0);

    if (Number(provider.status) === 1 && verifiedFaceValue > 0 && actualCredit > 0) {
      await adminDb().runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('NOT_FOUND');
        const current = snap.data()!;
        if (current.credited === true) return;

        const userRef = adminDb().collection('users').doc(user.uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

        tx.update(userRef, {
          balance: FieldValue.increment(actualCredit),
          totalDeposited: FieldValue.increment(actualCredit),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(ref, {
          status: 'success',
          providerStatus: provider.status,
          providerTransId: provider.trans_id ?? null,
          declaredValue: provider.declared_value ?? body.amount,
          verifiedValue: verifiedFaceValue,
          creditedAmount: actualCredit,
          credited: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(userRef.collection('transactions').doc(), {
          type: 'deposit',
          amount: actualCredit,
          depositId: requestId,
          provider: 'nappay',
          providerReference: String(provider.trans_id ?? requestId),
          createdAt: FieldValue.serverTimestamp(),
        });

        tx.set(userRef.collection('notifications').doc(), {
          type: 'deposit_success',
          title: 'Nạp thẻ thành công',
          message: `Ví được cộng ${actualCredit.toLocaleString('vi-VN')} VNĐ.`,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    } else {
      await ref.set({
        status: Number(provider.status) === 99 ? 'pending' : 'failed',
        providerStatus: provider.status ?? null,
        providerMessage: provider.message ?? null,
        providerTransId: provider.trans_id ?? null,
        verifiedValue: provider.value ?? 0,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return ok({
      requestId,
      status: provider.status,
      message: provider.message,
      declaredAmount: body.amount,
      verifiedValue: provider.value ?? 0,
      creditedAmount: provider.amount ?? 0,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
