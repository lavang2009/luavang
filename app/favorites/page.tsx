'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Product } from '@/types';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

type FavoriteRow = { id: string; productId: string };

export default function Favorites() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setBusy(false);
      return;
    }

    let active = true;
    setBusy(true);

    (async () => {
      try {
        const favorites = await api<FavoriteRow[]>('/api/favorites');
        const ids = favorites.map(item => item.productId).join(',');
        if (!ids) {
          if (active) setProducts([]);
          return;
        }
        const data = await api<Product[]>(`/api/products?ids=${encodeURIComponent(ids)}`);
        if (active) setProducts(data);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setBusy(false);
      }
    })();

    return () => { active = false; };
  }, [user]);

  if (loading || busy) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[.24em] text-fuchsia-300/70">FAVORITES</div>
          <h1 className="mt-2 text-4xl font-black">Sản phẩm yêu thích</h1>
        </div>
        <Link href="/shop" className="text-sm text-cyan-300 hover:text-cyan-200">Tiếp tục mua hàng →</Link>
      </div>
      {!user ? (
        <div className="mt-8"><EmptyState title="Cần đăng nhập" description="Đăng nhập để lưu và xem sản phẩm yêu thích." /></div>
      ) : products.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="mt-8"><EmptyState title="Chưa có sản phẩm yêu thích" description="Mở sản phẩm và nhấn nút trái tim để lưu." /></div>
      )}
    </div>
  );
}
