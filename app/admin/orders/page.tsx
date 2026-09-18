'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {money} from '@/lib/utils';
import {toast} from 'sonner';

type Row={id:string;userId:string;total:number;status:string};
export default function OrdersAdmin(){
 const [rows,setRows]=useState<Row[]>([]); const [busy,setBusy]=useState<string|null>(null);
 async function load(){try{setRows(await api<Row[]>('/api/admin/orders'))}catch(e){toast.error(e instanceof Error?e.message:'Không tải được orders.')}}
 useEffect(()=>{load()},[]);
 async function act(row:Row,action:'cancel'|'refund'){
  if(busy) return; const reason=window.prompt(action==='refund'?'Lý do hoàn tiền:':'Lý do hủy đơn:','Admin xử lý thủ công');
  if(!reason||reason.trim().length<3) return;
  setBusy(row.id);
  try{await api(`/api/admin/orders/${row.id}`,{method:'PATCH',body:JSON.stringify({action,reason:reason.trim()})});toast.success(action==='refund'?'Đã hoàn tiền.':'Đã hủy đơn.');await load()}catch(e){toast.error(e instanceof Error?e.message:'Không cập nhật được.')}finally{setBusy(null)}
 }
 return <div><h1 className="text-3xl font-black">Orders</h1><div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm"><thead className="bg-white/5"><tr><th className="px-4 py-3 text-left">Order</th><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody className="divide-y divide-white/8">{rows.map(r=><tr key={r.id}><td className="px-4 py-3 font-mono">{r.id}</td><td className="px-4 py-3 text-white/45">{r.userId}</td><td className="px-4 py-3">{money(r.total)}</td><td className="px-4 py-3"><Badge tone={r.status==='completed'?'green':r.status==='refunded'?'orange':'cyan'}>{r.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2">{['pending','processing'].includes(r.status)&&<Button variant="danger" onClick={()=>act(r,'cancel')} loading={busy===r.id}>Hủy</Button>}{r.status==='completed'&&<Button variant="secondary" onClick={()=>act(r,'refund')} loading={busy===r.id}>Hoàn tiền</Button>}</div></td></tr>)}</tbody></table></div></div>
}
