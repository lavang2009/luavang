import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ok, fail, handleApiError } from '@/lib/server/http';
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string; productId: string }> }) {
  try {
    const user = await requireUser(request); const { orderId, productId } = await params;
    const order = await adminDb().collection('orders').doc(orderId).get();
    if (!order.exists || !order.data() || order.data().userId !== user.uid) return fail('Không tìm thấy quyền tải file.',404,'NOT_FOUND');
    if (!order.data() || order.data().status !== 'completed') return fail('Đơn hàng chưa hoàn tất.',409,'ORDER_NOT_COMPLETED');
    const delivery = ((order.data() && order.data().delivery) || []).find((x:any)=>x.productId===productId && x.kind==='file');
    if (!delivery) return fail('File chưa sẵn sàng.',404,'FILE_NOT_READY');
    const product = await adminDb().collection('products').doc(productId).get();
    const storagePath = product.data() && product.data().fileStoragePath;
    if (!storagePath) return fail('File chưa sẵn sàng.',404,'FILE_NOT_READY');
    const [url]=await adminStorage().bucket().file(storagePath).getSignedUrl({action:'read',expires:Date.now()+10*60*1000});
    await product.ref.update({downloadCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp()});
    return NextResponse.redirect(url, 302);
  } catch(e){return handleApiError(e)}
}
