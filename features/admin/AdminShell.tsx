'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Package, Boxes, ShoppingBag, Wallet, Ticket, LogOut, FileArchive } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const nav = [
  ['Dashboard', '/admin', LayoutDashboard],
  ['Users', '/admin/users', Users],
  ['Products', '/admin/products', Package],
  ['ACC Inventory', '/admin/inventory', Boxes],
  ['Files', '/admin/files', FileArchive],
  ['Orders', '/admin/orders', ShoppingBag],
  ['Deposits', '/admin/deposits', Wallet],
  ['Vouchers', '/admin/vouchers', Ticket],
  ['Notifications', '/admin/notifications', Ticket],
  ['Settings', '/admin/settings', Ticket],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAuthorized(false);
      return () => { active = false; };
    }
    user.getIdTokenResult(true)
      .then(result => {
        if (!active) return;
        if (result.claims.admin === true) setAuthorized(true);
        else router.replace('/profile');
      })
      .catch(() => {
        if (active) router.replace('/profile');
      });
    return () => { active = false; };
  }, [user, router]);

  if (loading || !user || !authorized) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-4 overflow-x-auto lg:hidden">
        <nav className="flex min-w-max gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-2">
          {nav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${path === href ? 'bg-linear-to-r from-fuchsia-500/20 to-cyan-400/10 text-white' : 'text-white/50'}`}
            >
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex gap-5">
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-60 shrink-0 rounded-2xl border border-white/10 bg-white/[.035] p-3 lg:block">
          {nav.map(([label, href, Icon]) => (
            <Link key={href} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${path === href ? 'bg-linear-to-r from-fuchsia-500/20 to-cyan-400/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
          <button onClick={() => router.push('/profile')} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" />Tài khoản
          </button>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
