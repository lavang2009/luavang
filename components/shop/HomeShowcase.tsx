'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Clock3, PackageCheck, Sparkles, TicketPercent } from 'lucide-react';
import { api } from '@/lib/client/api';
import type { Product } from '@/types';
import { ProductCard } from '@/components/shop/ProductCard';
import { Card } from '@/components/ui/Card';

type Stats = {
  activeProducts: number;
  completedOrders: number;
  registeredUsers: number;
  availability: string;
};

export function HomeShowcase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Product[]>('/api/products?limit=48'),
      api<Stats>('/api/public/stats'),
    ]).then(([productData, statsData]) => {
      if (!active) return;
      setProducts(productData);
      setStats(statsData);
    }).catch(() => {
      if (active) setProducts([]);
    });
    return () => { active = false; };
  }, []);

  const featured = useMemo(() => products.filter(p => p.featured).slice(0, 4), [products]);
  const popular = useMemo(() => [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4), [products]);
  const newest = useMemo(() => [...products].slice(0, 4), [products]);
  const discounted = useMemo(() => products.filter(p => p.discount > 0).slice(0, 4), [products]);

  const section = (title: string, eyebrow: string, rows: Product[]) => rows.length ? (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[.24em] text-fuchsia-300/70">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
        </div>
        <Link href="/shop" className="text-sm text-white/45 hover:text-white">Xem tất cả →</Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  ) : null;

  return (
    <>
      {section('Sản phẩm nổi bật', 'Featured', featured)}
      {section('Đang được mua nhiều', 'Popular', popular)}
      {section('Sản phẩm mới', 'New arrivals', newest)}
      {section('Đang có ưu đãi', 'Promotion', discounted)}

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <PackageCheck className="h-5 w-5 text-cyan-300" />
            <div className="mt-4 text-2xl font-black">{stats?.activeProducts ?? '—'}</div>
            <div className="mt-1 text-sm text-white/40">Sản phẩm đang mở bán</div>
          </Card>
          <Card className="p-5">
            <BarChart3 className="h-5 w-5 text-fuchsia-300" />
            <div className="mt-4 text-2xl font-black">{stats?.completedOrders ?? '—'}</div>
            <div className="mt-1 text-sm text-white/40">Đơn hàng đã hoàn tất</div>
          </Card>
          <Card className="p-5">
            <Sparkles className="h-5 w-5 text-emerald-300" />
            <div className="mt-4 text-2xl font-black">{stats?.registeredUsers ?? '—'}</div>
            <div className="mt-1 text-sm text-white/40">Tài khoản đã đăng ký</div>
          </Card>
          <Card className="p-5">
            <Clock3 className="h-5 w-5 text-orange-300" />
            <div className="mt-4 text-2xl font-black">{stats?.availability ?? '24/7'}</div>
            <div className="mt-1 text-sm text-white/40">Thời gian phục vụ</div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <TicketPercent className="h-6 w-6 text-pink-300" />
            <h2 className="mt-4 text-xl font-black">Voucher & khuyến mãi</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Voucher được kiểm tra ở phía server theo hạn sử dụng, số lần dùng, sản phẩm và danh mục. Không có mã demo trong production.
            </p>
            <Link href="/checkout" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
              Dùng voucher khi checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-black">Thanh toán & giao hàng</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Nạp qua SePay hoặc NAPPay. Wallet chỉ được cộng bởi server sau khi provider xác nhận. ACC được lock bằng transaction; file dùng signed URL riêng tư.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
