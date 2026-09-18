import {NextRequest} from 'next/server';import {requireUser,ensureUserDocument} from '@/lib/server/auth';import {ok,handleApiError} from '@/lib/server/http';
export async function POST(req:NextRequest){try{const user=await requireUser(req);await ensureUserDocument(user.uid,{email:user.email});return ok({ready:true})}catch(e){return handleApiError(e)}}
