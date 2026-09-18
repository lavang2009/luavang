import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { CartItem } from '@/types';
import { decryptSecret, encryptSecret } from '@/lib/server/crypto';

type CheckoutResult = { orderId: string; reused: boolean };

export async function checkoutWallet(
  uid: string,
  cart: CartItem[],
  voucherCode?: string,
  idempotencyKey?: string,
): Promise<CheckoutResult> {
  if (!cart.length) throw new Error('CART_EMPTY');
  if (cart.length > 20) throw new Error('CART_TOO_LARGE');
  if (!idempotencyKey) throw new Error('CHECKOUT_IDEMPOTENCY_REQUIRED');
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) throw new Error('INVALID_IDEMPOTENCY_KEY');

  const normalizedMap = new Map<string, number>();
  let totalQuantity = 0;
  for (const item of cart) {
    const q = Math.min(20, Math.max(1, Math.trunc(item.quantity)));
    totalQuantity += q;
    normalizedMap.set(item.productId, (normalizedMap.get(item.productId) || 0) + q);
  }
  if (totalQuantity > 20) throw new Error('CART_TOO_LARGE');

  const normalized = [...normalizedMap.entries()].map(([productId, quantity]) => ({ productId, quantity }));
  const db = adminDb();
  const userRef = db.collection('users').doc(uid);
  const idempotencyRef = userRef.collection('checkoutIdempotency').doc(idempotencyKey);
  const orderRef = db.collection('orders').doc();
  const orderId = orderRef.id;

  return db.runTransaction(async (tx): Promise<CheckoutResult> => {
    const userSnap = await tx.get(userRef);
    const existingKey = await tx.get(idempotencyRef);
    if (existingKey.exists && existingKey.data()?.orderId) {
      return { orderId: String(existingKey.data()?.orderId), reused: true };
    }
    if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

    const user = userSnap.data()!;
    if (user.status === 'blocked') throw new Error('ACCOUNT_BLOCKED');

    const productSnaps = [];
    for (const item of normalized) {
      productSnaps.push(await tx.get(db.collection('products').doc(item.productId)));
    }

    const productRows = productSnaps.map((snap, i) => ({
      snap,
      data: snap.data(),
      quantity: normalized[i]!.quantity,
    }));

    if (productRows.some(x => !x.snap.exists || !x.data || x.data.status !== 'active')) {
      throw new Error('PRODUCT_UNAVAILABLE');
    }

    if (productRows.some(x => x.data?.category === 'file' && x.quantity !== 1)) {
      throw new Error('FILE_QUANTITY_MUST_BE_ONE');
    }

    const voucherId = voucherCode?.trim().toUpperCase();
    const voucherRef = voucherId ? db.collection('vouchers').doc(voucherId) : null;
    const redemptionRef = voucherId
      ? db.collection('voucherRedemptions').doc(`${voucherId}_${uid}`)
      : null;

    const voucherSnap = voucherRef ? await tx.get(voucherRef) : null;
    const redemptionSnap = redemptionRef ? await tx.get(redemptionRef) : null;

    const items = productRows.map(({ snap, data, quantity }) => ({
      productId: snap.id,
      name: String(data!.name),
      category: data!.category,
      unitPrice: Number(data!.price),
      quantity,
      discount: 0,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let discount = 0;

    if (voucherCode) {
      if (!voucherSnap?.exists || !voucherRef || !redemptionRef) throw new Error('VOUCHER_INVALID');
      const v = voucherSnap.data()!;
      const now = Date.now();
      const start = v.startDate?.toDate ? v.startDate.toDate().getTime() : 0;
      const end = v.endDate?.toDate ? v.endDate.toDate().getTime() : Number.MAX_SAFE_INTEGER;
      const usageLimit = Number(v.usageLimit ?? Number.MAX_SAFE_INTEGER);

      if (v.active === false || now < start || now > end || subtotal < Number(v.minOrder || 0)) {
        throw new Error('VOUCHER_INVALID');
      }
      if (redemptionSnap?.exists) throw new Error('VOUCHER_ALREADY_USED');
      if (Number(v.usageCount || 0) >= usageLimit) throw new Error('VOUCHER_EXHAUSTED');

      if (v.category && items.some(i => i.category !== v.category)) {
        throw new Error('VOUCHER_CATEGORY_RESTRICTED');
      }

      if (Array.isArray(v.productIds) && v.productIds.length > 0 && items.some(i => !v.productIds.includes(i.productId))) {
        throw new Error('VOUCHER_PRODUCT_RESTRICTED');
      }

      const value = Number(v.value || 0);
      discount = v.type === 'percent'
        ? Math.min(subtotal * Math.max(0, Math.min(100, value)) / 100, Number(v.maxDiscount || Number.MAX_SAFE_INTEGER))
        : Math.min(Math.max(0, value), subtotal);
    }

    const total = Math.max(0, Math.round(subtotal - discount));
    if (Number(user.balance || 0) < total) throw new Error('INSUFFICIENT_BALANCE');

    // READ EVERY ACC INVENTORY DOCUMENT BEFORE ANY TRANSACTION WRITE.
    const selectedInventory: Array<{
      productId: string;
      quantity: number;
      docs: QueryDocumentSnapshot[];
    }> = [];

    for (const row of productRows) {
      if (row.data!.category !== 'acc') continue;

      const invQuery = db.collection('products')
        .doc(row.snap.id)
        .collection('inventory')
        .where('status', '==', 'available')
        .orderBy('createdAt', 'asc')
        .limit(row.quantity);

      const inv = await tx.get(invQuery);
      if (inv.size < row.quantity) throw new Error('OUT_OF_STOCK');
      selectedInventory.push({ productId: row.snap.id, quantity: row.quantity, docs: inv.docs });
    }

    const deliveryRefs: Array<{ productId: string; itemId?: string; kind: 'acc' | 'file' }> = [];

    for (const selected of selectedInventory) {
      for (const d of selected.docs) {
        const inventory = d.data();
        if (inventory.status !== 'available' || !inventory.secretEnc) throw new Error('OUT_OF_STOCK');

        const parsed = JSON.parse(decryptSecret(String(inventory.secretEnc)));
        tx.update(d.ref, {
          status: 'sold',
          soldAt: FieldValue.serverTimestamp(),
          orderId,
        });

        const deliveryRef = db.collection('orderDeliveries').doc(`${orderId}_${d.id}`);
        tx.set(deliveryRef, {
          orderId,
          userId: uid,
          productId: selected.productId,
          itemId: d.id,
          kind: 'acc',
          secretEnc: encryptSecret(JSON.stringify({
            username: String(parsed.username || ''),
            password: String(parsed.password || ''),
            note: String(parsed.note || ''),
          })),
          createdAt: FieldValue.serverTimestamp(),
        });

        deliveryRefs.push({ productId: selected.productId, itemId: d.id, kind: 'acc' });
      }
    }

    for (const row of productRows) {
      if (row.data!.category === 'file' && !row.data!.fileStoragePath) {
        throw new Error('FILE_NOT_CONFIGURED');
      }
      if (row.data!.category === 'file') {
        deliveryRefs.push({ productId: row.snap.id, kind: 'file' });
      }
    }

    const transactionRef = userRef.collection('transactions').doc();
    tx.update(userRef, {
      balance: FieldValue.increment(-total),
      totalSpent: FieldValue.increment(total),
      totalOrders: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(transactionRef, {
      type: 'purchase',
      amount: -total,
      orderId,
      balanceAfter: Number(user.balance || 0) - total,
      createdAt: FieldValue.serverTimestamp(),
    });

    for (const row of productRows) {
      tx.update(row.snap.ref, {
        soldCount: FieldValue.increment(row.quantity),
        inventoryCount: row.data!.category === 'acc'
          ? FieldValue.increment(-row.quantity)
          : FieldValue.increment(0),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(orderRef, {
      orderId,
      userId: uid,
      items,
      subtotal,
      discount,
      total,
      paymentMethod: 'wallet',
      status: 'completed',
      deliveryStatus: 'completed',
      delivery: deliveryRefs,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });

    tx.set(idempotencyRef, {
      key: idempotencyKey,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (voucherSnap?.exists && voucherRef && redemptionRef) {
      tx.set(redemptionRef, {
        voucherId: voucherRef.id,
        userId: uid,
        orderId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(voucherRef, {
        usageCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(userRef.collection('notifications').doc(), {
      type: 'purchase_success',
      title: 'Mua hàng thành công',
      message: `Đơn #${orderId} đã hoàn tất.`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(db.collection('publicActivity').doc(orderId), {
      orderId,
      productNames: items.map(i => i.name),
      category: items[0]?.category || 'other',
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId, reused: false };
  });
}
