'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client/api';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {money} from '@/lib/utils';
import {toast} from 'sonner';

type Row={id:string;displayName?:string;username?:string;email?:string;balance?:number;status?:string;role?:string};
export default function UsersAdmin(){
 const [rows,setRows]=useState<Row[]>([]); const [busy,setBusy]=useState<string|null>(null);
 async function load(){try{setRows(await api<Row[]>('/api/admin/users'))}catch(e){toast.error(e instanceof Error?e.message:'Không tải được users.')}}
 useEffect(()=>{load()},[]);
 async function toggle(row:Row){
  if(busy) return; setBusy(row.id);
  try{await api(`/api/admin/users/${row.id}`,{method:'PATCH',body:JSON.stringify({status:row.status==='blocked'?'active':'blocked'})});toast.success(row.status==='blocked'?'Đã mở khóa tài khoản.':'Đã khóa tài khoản.');await load()}catch(e){toast.error(e instanceof Error?e.message:'Không cập nhật được.')}finally{setBusy(null)}
 }
 return <div><h1 className="text-3xl font-black">Users</h1><div className="mt-6 space-y-3">{rows.map(r=><Card key={r.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold">{r.displayName||r.username||'User'}</div><div className="text-xs text-white/35">{r.email} · {r.id}</div><div className="mt-1 text-xs text-white/35">Role: {r.role||'user'}</div></div><div className="flex flex-wrap items-center gap-3"><span className="text-sm">{money(r.balance||0)}</span><Badge tone={r.status==='blocked'?'orange':'green'}>{r.status||'active'}</Badge><Button variant={r.status==='blocked'?'secondary':'danger'} onClick={()=>toggle(r)} loading={busy===r.id}>{r.status==='blocked'?'Mở khóa':'Khóa'}</Button></div></div></Card>)}</div></div>
}
