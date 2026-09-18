"use client";
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/client/api';
import { money } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

type Deposit = { depositId: string; amount: number; code: string; qr: string; status?: string };

export default function Deposit() {
  const [amount, setAmount] = useState(10000);
  const [data, setData] = useState<Deposit | null>(null);
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);

  async function create() {
    setBusy(true);
    try {
      const result = await api<Omit<Deposit, 'status'>>('/api/deposits', { method: 'POST', body: JSON.stringify({ amount }) });
      setData(result);
      setStatus('pending');
      startedAt.current = Date.now();
      toast.success('Đã tạo lệnh nạp.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được lệnh nạp.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!data?.depositId) return;
    let active = true;
    const timer = window.setInterval(async () => {
      if (!active || Date.now() - startedAt.current > 10 * 60 * 1000) return;
      try {
        const result = await api<{ status: string }>(`/api/deposits/${data.depositId}`);
        if (!active) return;
        setStatus(result.status);
        if (result.status === 'success') {
          toast.success('Nạp tiền thành công. Số dư đã được cập nhật.');
          window.clearInterval(timer);
        }
        if (['failed', 'rejected', 'expired'].includes(result.status)) window.clearInterval(timer);
      } catch { /* polling is best-effort */ }
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [data?.depositId]);

  return <div className="mx-auto max-w-3xl px-4 py-12 md:px-6"><div className="flex items-end justify-between"><div><div className="text-xs uppercase tracking-[.2em] text-cyan-300/70">WALLET</div><h1 className="mt-2 text-4xl font-black">Nạp tiền</h1></div><Link href="/deposit/history" className="text-sm text-white/45 hover:text-white">Lịch sử nạp →</Link></div><div className="mt-8 grid gap-6 md:grid-cols-2"><Card className="p-6"><div className="font-semibold">SePay / chuyển khoản ngân hàng</div><div className="mt-5"><Input label="Số tiền (VNĐ)" type="number" min={1000} max={50000000} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></div><div className="mt-4 grid grid-cols-3 gap-2">{[10000,50000,100000].map(v=><button key={v} onClick={()=>setAmount(v)} className="rounded-xl border border-white/10 bg-white/5 py-2 text-xs text-white/65 hover:bg-white/8">{money(v)}</button>)}</div><Button onClick={create} loading={busy} className="mt-5 w-full">Tạo mã nạp</Button></Card>{data?<Card className="p-6"><div className="flex items-center justify-between"><div className="text-xs uppercase tracking-[.18em] text-fuchsia-300/70">DEPOSIT</div><Badge tone={status==='success'?'green':status==='failed'?'orange':'gray'}>{status}</Badge></div><div className="mt-2 text-2xl font-black">{money(data.amount)}</div><div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-white/35">Nội dung chuyển khoản</div><div className="mt-1 font-mono text-lg text-cyan-200">{data.code}</div></div><img src={data.qr} alt="QR thanh toán" className="mx-auto mt-5 w-60 rounded-2xl bg-white p-3"/><div className="mt-4 text-center text-xs text-white/35">Server tự kiểm tra trạng thái mỗi 5 giây; chỉ webhook SePay hợp lệ mới cộng ví.</div></Card>:<Card className="p-6"><div className="text-sm font-semibold">Quy trình</div><div className="mt-4 space-y-3 text-sm text-white/45"><div>01 — Tạo lệnh nạp.</div><div>02 — Chuyển khoản đúng số tiền và mã.</div><div>03 — SePay gửi webhook đã xác thực.</div><div>04 — Server idempotent cập nhật ví một lần.</div></div></Card>}</div></div>;
}
