import { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkCard, verifyNappayResponse } from '@/services/payments/nappay';
import { decryptSecret } from '@/lib/server/crypto';
import { ok, fail, handleApiError, rateLimit } from '@/lib/server/http';

export async function GET(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    if (!rateLimit(req, 'deposit:card:check')) return fail('Too many requests.', 429, 'RATE_LIMITED');

    const user = await requireUser(req);
    const { requestId } = await params;
    const ref = adminDb().collection('cardDeposits').doc(requestId);
    const current = await ref.get();

    if (!current.exists || current.data()?.userId !== user.uid) {
      return fail('Không tìm thấy giao dịch.', 404, 'NOT_FOUND');
    }

    const currentData = current.data()!;
    if (currentData.status === 'success') return ok({ id: current.id, ...currentData });

    if (!currentData.credentialEnc) {
      return fail('Giao dịch cũ không thể kiểm tra lại.', 409, 'REQUEST_FAILED');
    }

    const credentials = JSON.parse(decryptSecret(String(currentData.credentialEnc))) as {
      serial: string;
      code: string;
    };

    const provider = await checkCard(requestId);

    if (!verifyNappayResponse(provider, credentials.code, credentials.serial)) {
      throw new Error('REQUEST_FAILED');
    }

    if (Number(provider.status) === 1 && Number(provider.amount || 0) > 0) {
      await adminDb().runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('NOT_FOUND');

        const card = snap.data()!;
        if (card.credited === true || card.status === 'success') return;

        const amount = Number(provider.amount || 0);
        const userRef = adminDb().collection('users').doc(user.uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

        tx.update(userRef, {
          balance: FieldValue.increment(amount),
          totalDeposited: FieldValue.increment(amount),
          updatedAt: FieldValue.serverTimestamp()
        });

        tx.update(ref, {
          status: 'success',
          providerStatus: provider.status,
          providerTransId: provider.trans_id ?? null,
          verifiedValue: provider.value ?? 0,
          creditedAmount: amount,
          credited: true,
          credentialEnc: FieldValue.delete(),
          providerMessage: provider.message ?? null,
          updatedAt: FieldValue.serverTimestamp()
        });

        tx.set(userRef.collection('transactions').doc(), {
          type: 'deposit',
          amount,
          depositId: requestId,
          provider: 'nappay',
          providerReference: String(provider.trans_id ?? requestId),
          createdAt: FieldValue.serverTimestamp()
        });

        tx.set(userRef.collection('notifications').doc(), {
          type: 'deposit_success',
          title: 'Nạp thẻ thành công',
          message: `Nạp ${amount.toLocaleString('vi-VN')} VNĐ qua NAPPay.`,
          read: false,
          createdAt: FieldValue.serverTimestamp()
        });
      });
    } else {
      await ref.set({
        status: Number(provider.status) === 99 ? 'pending' : 'failed',
        providerStatus: provider.status ?? null,
        providerMessage: provider.message ?? null,
        verifiedValue: provider.value ?? 0,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const latest = await ref.get();
    const latestData = latest.data() || {};
    delete latestData.credentialEnc;
    return ok({ id: latest.id, ...latestData });
  } catch (e) {
    return handleApiError(e);
  }
}
