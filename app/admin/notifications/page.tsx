"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/client/api';
import { toast } from 'sonner';

type Row = { id:string; title:string; message:string; type:string; active:boolean; createdAt:unknown };
export default function AdminNotifications(){
 const [rows,setRows]=useState<Row[]>([]); const [title,setTitle]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 async function load(){try{setRows(await api<Row[]>('/api/admin/notifications'))}catch(e){toast.error(e instanceof Error?e.message:'Không tải được thông báo.')}}
 useEffect(()=>{load()},[]);
 async function publish(){if(busy||!title.trim()||!message.trim())return;setBusy(true);try{await api('/api/admin/notifications',{method:'POST',body:JSON.stringify({title,message,type:'system'})});setTitle('');setMessage('');toast.success('Đã phát thông báo hệ thống.');await load()}catch(e){toast.error(e instanceof Error?e.message:'Không phát được thông báo.')}finally{setBusy(false)}}
 return <div><h1 className="text-3xl font-black">Notifications</h1><Card className="mt-6 p-5"><div className="grid gap-3"><Input label="Tiêu đề" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/><label className="space-y-2"><span className="text-sm text-white/70">Nội dung</span><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} className="min-h-32 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none"/></label></div><Button className="mt-4" onClick={publish} loading={busy}>Phát thông báo</Button><p className="mt-2 text-xs text-white/35">Thông báo hệ thống dùng collection riêng; không fan-out hàng nghìn document trong một request.</p></Card><div className="mt-6 space-y-3">{rows.map(r=><Card key={r.id} className="p-4"><div className="font-semibold">{r.title}</div><div className="mt-1 text-sm text-white/45">{r.message}</div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/25"><span>{r.type} · {r.id}</span><Button variant={r.active?'danger':'secondary'} onClick={async()=>{try{await api('/api/admin/notifications',{method:'PATCH',body:JSON.stringify({id:r.id,active:!r.active})});toast.success(r.active?'Đã tắt thông báo.':'Đã bật thông báo.');await load()}catch(e){toast.error(e instanceof Error?e.message:'Không cập nhật được.')}}}>{r.active?'Tắt':'Bật'}</Button></div></Card>)}</div></div>
}
