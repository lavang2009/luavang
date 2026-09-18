import {NextRequest} from 'next/server';import {z} from 'zod';import {FieldValue} from 'firebase-admin/firestore';import {requireUser} from '@/lib/server/auth';import {adminDb} from '@/lib/firebase-admin';import {ok,handleApiError} from '@/lib/server/http';
const schema=z.object({productId:z.string().min(1)});
export async function GET(req:NextRequest){
  try{
    const user=await requireUser(req);
    const productId=req.nextUrl.searchParams.get('productId');
    const favorites=adminDb().collection('users').doc(user.uid).collection('favorites');
    if(productId){
      const snap=await favorites.doc(productId).get();
      return ok({saved:snap.exists});
    }
    const s=await favorites.orderBy('createdAt','desc').limit(100).get();
    return ok(s.docs.map(d=>({id:d.id,...d.data()})));
  }catch(e){return handleApiError(e)}
}
export async function POST(req:NextRequest){try{const user=await requireUser(req);const b=schema.parse(await req.json());const product=await adminDb().collection('products').doc(b.productId).get();if(!product.exists||!product.data()||product.data().status!=='active')throw new Error('PRODUCT_UNAVAILABLE');await adminDb().collection('users').doc(user.uid).collection('favorites').doc(b.productId).set({productId:b.productId,createdAt:FieldValue.serverTimestamp()});return ok({saved:true})}catch(e){return handleApiError(e)}}
export async function DELETE(req:NextRequest){try{const user=await requireUser(req);const b=schema.parse(await req.json());await adminDb().collection('users').doc(user.uid).collection('favorites').doc(b.productId).delete();return ok({deleted:true})}catch(e){return handleApiError(e)}}
