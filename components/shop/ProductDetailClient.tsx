'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';
import { api } from '@/lib/client/api';
import { useCartStore } from '@/stores/cart';
import type { Product } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { money } from '@/lib/utils';

export function ProductDetailClient({ p }: { p: Product }) {
  const { user } = useAuth();
  const add = useCartStore(s => s.add);
  const [favorite, setFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setFavorite(false);
      return () => { active = false; };
    }
    api<{ saved: boolean }>(`/api/favorites?productId=${encodeURIComponent(p.id)}`)
      .then(result => { if (active) setFavorite(result.saved); })
      .catch(() => { if (active) setFavorite(false); });
    return () => { active = false; };
  }, [user, p.id]);

  async function toggleFavorite() {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu yêu thích.');
      return;
    }
    if (favoriteBusy) return;

    setFavoriteBusy(true);
    try {
      if (favorite) {
        await api('/api/favorites', {
          method: 'DELETE',
          body: JSON.stringify({ productId: p.id }),
        });
        setFavorite(false);
        toast.success('Đã bỏ khỏi yêu thích.');
      } else {
        await api('/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ productId: p.id }),
        });
        setFavorite(true);
        toast.success('Đã thêm vào yêu thích.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể cập nhật yêu thích.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
          <div className="relative aspect-[4/3]">
            {p.thumbnail ? (
              <Image src={p.thumbnail} alt={p.name} fill className="object-cover" sizes="(max-width:1024px) 100vw, 55vw" />
            ) : (
              <div className="grid h-full place-items-center bg-linear-to-br from-violet-950 via-fuchsia-950 to-cyan-950 text-6xl font-black text-white/15">LV</div>
            )}
          </div>
        </div>

        <div>
          <div className="flex gap-2">
            <Badge tone={p.category === 'acc' ? 'cyan' : 'violet'}>{p.category.toUpperCase()}</Badge>
            {p.discount > 0 && <Badge tone="pink">-{p.discount}%</Badge>}
          </div>
          <h1 className="mt-4 text-4xl font-black">{p.name}</h1>

          <div className="mt-5 flex items-end gap-3">
            <div className="text-3xl font-black">{money(p.price)}</div>
            {p.originalPrice > p.price && <div className="pb-1 text-sm text-white/35 line-through">{money(p.originalPrice)}</div>}
          </div>

          <p className="mt-5 whitespace-pre-wrap leading-7 text-white/50">{p.description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/35">Tồn kho</div>
              <div className="mt-1 font-semibold">{p.inventoryCount}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/35">Đã bán</div>
              <div className="mt-1 font-semibold">{p.soldCount}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/35">Lượt xem</div>
              <div className="mt-1 font-semibold">{p.viewCount}</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => { add({ productId: p.id, quantity: 1 }); toast.success('Đã thêm vào giỏ hàng.'); }}>
              <ShoppingCart className="h-4 w-4" />Thêm vào giỏ
            </Button>
            <Link href="/cart" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 border border-white/15 bg-white/8 text-white hover:bg-white/12">Đi tới giỏ<ArrowRight className="h-4 w-4" /></Link>
            <Button variant="ghost" onClick={toggleFavorite} loading={favoriteBusy} aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}>
              <Heart className={`h-4 w-4 ${favorite ? 'fill-current text-pink-300' : ''}`} />
              {favorite ? 'Đã thích' : 'Yêu thích'}
            </Button>
          </div>

          <Card className="mt-8 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <div>
                <div className="text-sm font-semibold">Bảo vệ thanh toán</div>
                <div className="mt-1 text-xs leading-5 text-white/40">Giá, tồn kho và số dư được xác minh trên server trước khi tạo đơn.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
