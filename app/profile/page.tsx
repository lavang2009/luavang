'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { api } from '@/lib/client/api';
import { money } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const tabs = [
  ['Overview', '/profile'],
  ['Orders', '/orders'],
  ['Deposits', '/deposit/history'],
  ['Favorites', '/favorites'],
  ['Notifications', '/notifications'],
  ['Settings', '/settings'],
] as const;

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [data, setData] = useState<any>();

  useEffect(() => {
    if (user) api<any>('/api/users/me').then(setData).catch(() => setData(undefined));
  }, [user]);

  if (loading || !user || !data) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[.2em] text-cyan-300/70">ACCOUNT</div>
          <h1 className="mt-2 text-4xl font-black">{data.displayName || data.username}</h1>
          <p className="mt-1 text-white/40">{data.email}</p>
        </div>
        <Button variant="danger" onClick={logout}>Đăng xuất</Button>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-2">
          {tabs.map(([label, href]) => <Link key={href} href={href} className={`rounded-xl px-4 py-2.5 text-sm ${href === '/profile' ? 'bg-linear-to-r from-fuchsia-500/20 to-cyan-400/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>{label}</Link>)}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><div className="text-xs text-white/35">Số dư</div><div className="mt-2 text-2xl font-black">{money(data.balance || 0)}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/35">Tổng đã nạp</div><div className="mt-2 text-2xl font-black">{money(data.totalDeposited || 0)}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/35">Tổng đã tiêu</div><div className="mt-2 text-2xl font-black">{money(data.totalSpent || 0)}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/35">Đơn hàng</div><div className="mt-2 text-2xl font-black">{data.totalOrders || 0}</div></Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="font-semibold">Hành động nhanh</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/deposit" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 w-full bg-linear-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-neon hover:brightness-110">Nạp tiền</Link>
            <Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 w-full border border-white/15 bg-white/8 text-white hover:bg-white/12">Đơn hàng</Link>
            <Link href="/deposit/history" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 w-full border border-white/15 bg-white/8 text-white hover:bg-white/12">Lịch sử nạp</Link>
            <Link href="/favorites" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 w-full border border-white/15 bg-white/8 text-white hover:bg-white/12">Yêu thích</Link>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Trạng thái tài khoản</div>
          <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/5 p-4">
            <div className="text-sm text-emerald-200">{data.status}</div>
            <div className="mt-1 text-xs text-white/40">Role: {data.role}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
