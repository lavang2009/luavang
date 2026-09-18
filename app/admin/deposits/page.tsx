'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client/api';
import {money,dateTime} from '@/lib/utils';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {toast} from 'sonner';

type Row={id:string;userId:string;amount:number;method:string;createdAt:unknown;status:string};
export default function DepositsAdmin(){
 const [rows,setRows]=useState<Row[]>([]); const [busy,setBusy]=useState<string|null>(null);
 async function load(){try{setRows(await api<Row[]>('/api/admin/deposits'))}catch(e){toast.error(e instanceof Error?e.message:'Không tải được deposits.')}}
 useEffect(()=>{load()},[]);
 async function decide(row:Row,action:'approve'|'reject'){
  if(row.method!=='sepay'||busy) return;
  const reason=window.prompt(action==='approve'?'Ghi chú duyệt giao dịch:':'Lý do từ chối:','Admin kiểm tra thủ công');
  if(!reason||reason.trim().length<3) return;
  let amount=row.amount;
  if(action==='approve'){const input=window.prompt('Số tiền được cộng (VNĐ):',String(row.amount)); if(!input) return; amount=Number(input); if(!Number.isInteger(amount)||amount<=0){toast.error('Số tiền không hợp lệ.');return}}
  setBusy(row.id);
  try{await api(`/api/admin/deposits/${row.id}`,{method:'PATCH',body:JSON.stringify({action,amount:action==='approve'?amount:undefined,reason:reason.trim()})});toast.success(action==='approve'?'Đã duyệt nạp tiền.':'Đã từ chối nạp tiền.');await load()}catch(e){toast.error(e instanceof Error?e.message:'Không cập nhật được.')}finally{setBusy(null)}
 }
 return <div><h1 className="text-3xl font-black">Deposits</h1><div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm"><thead className="bg-white/5"><tr><th className="px-4 py-3 text-left">Time</th><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody className="divide-y divide-white/8">{rows.map(r=><tr key={`${r.method}-${r.id}`}><td className="px-4 py-3 text-white/40">{dateTime(r.createdAt)}</td><td className="px-4 py-3 font-mono">{r.userId}</td><td className="px-4 py-3">{money(r.amount)}</td><td className="px-4 py-3">{r.method}</td><td className="px-4 py-3"><Badge tone={r.status==='success'?'green':r.status==='rejected'?'orange':'gray'}>{r.status}</Badge></td><td className="px-4 py-3">{r.method==='sepay'&&['pending','processing'].includes(r.status)&&<div className="flex gap-2"><Button onClick={()=>decide(r,'approve')} loading={busy===r.id}>Duyệt</Button><Button variant="danger" onClick={()=>decide(r,'reject')} loading={busy===r.id}>Từ chối</Button></div>}</td></tr>)}</tbody></table></div></div>
}
