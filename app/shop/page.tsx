'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/client/api';
import { ProductCard } from '@/components/shop/ProductCard';
import type { Product } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

type ProductPage = { items: Product[]; nextCursor: string | null };

export default function Shop() {
  const sp = useSearchParams();
  const category = sp.get('category') || '';
  const [data, setData] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCursor(null);
    const qs = new URLSearchParams({ limit: '24', withCursor: '1' });
    if (category) qs.set('category', category);

    api<ProductPage>(`/api/products?${qs.toString()}`)
      .then(result => {
        setData(result.items);
        setCursor(result.nextCursor);
      })
      .catch(() => {
        setData([]);
        setCursor(null);
      })
      .finally(() => setLoading(false));
  }, [category]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({
        limit: '24',
        withCursor: '1',
        cursor,
      });
      if (category) qs.set('category', category);

      const result = await api<ProductPage>(`/api/products?${qs.toString()}`);
      setData(current => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const items = useMemo(() => {
    const min = minPrice === '' ? 0 : Math.max(0, Number(minPrice));
    const max = maxPrice === '' ? Number.MAX_SAFE_INTEGER : Math.max(0, Number(maxPrice));

    const filtered = data.filter(p => {
      const textMatch = p.name.toLowerCase().includes(q.toLowerCase())
        || p.description.toLowerCase().includes(q.toLowerCase());
      return textMatch && p.price >= min && p.price <= max;
    });

    return [...filtered].sort((a, b) =>
      sort === 'priceAsc' ? a.price - b.price :
      sort === 'priceDesc' ? b.price - a.price :
      sort === 'popular' ? b.soldCount - a.soldCount :
      sort === 'inventoryDesc' ? b.inventoryCount - a.inventoryCount :
      sort === 'inventoryAsc' ? a.inventoryCount - b.inventoryCount :
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  }, [data, q, sort, minPrice, maxPrice]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[.24em] text-fuchsia-300/70">SHOP</div>
          <h1 className="mt-2 text-4xl font-black">Kho sản phẩm</h1>
          <p className="mt-2 text-white/45">ACC và FILE — lọc theo dữ liệu thực tế.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none focus:border-fuchsia-400/50"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3">
            <SlidersHorizontal className="h-4 w-4 text-white/35" />
            <select value={sort} onChange={e => setSort(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white/75 outline-none">
              <option value="newest">Mới nhất</option>
              <option value="priceAsc">Giá tăng dần</option>
              <option value="priceDesc">Giá giảm dần</option>
              <option value="popular">Bán chạy</option>
              <option value="inventoryDesc">Tồn kho nhiều</option>
              <option value="inventoryAsc">Tồn kho ít</option>
            </select>
          </label>

          <input
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            type="number"
            min={0}
            placeholder="Giá từ"
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-fuchsia-400/50"
          />

          <input
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            type="number"
            min={0}
            placeholder="Giá đến"
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-fuchsia-400/50"
          />
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/5" />)}
          </div>
        ) : items.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {cursor && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Tải thêm sản phẩm</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="Không tìm thấy sản phẩm" description="Thử từ khóa khác hoặc đổi bộ lọc." />
        )}
      </div>
    </div>
  );
}
