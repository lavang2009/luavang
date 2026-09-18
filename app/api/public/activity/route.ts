import {adminDb} from '@/lib/firebase-admin'; import {ok,fail} from '@/lib/server/http';
export async function GET(){try{const s=await adminDb().collection('publicActivity').orderBy('createdAt','desc').limit(10).get();return ok(s.docs.map(d=>({id:d.id,...d.data()})))}catch{return fail('Không thể tải hoạt động.',500,'ACTIVITY_FAILED')}}
