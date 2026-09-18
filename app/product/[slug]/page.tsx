import type { Metadata } from 'next';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { ProductDetailClient } from '@/components/shop/ProductDetailClient';
import { notFound } from 'next/navigation';
import type { Product } from '@/types';
import { isoDate } from '@/lib/utils';

async function getProduct(slug: string, trackView = false) {
  const s = await adminDb().collection('products').where('slug', '==', slug).limit(1).get();
  if (s.empty) return null;

  const d = s.docs[0]!;
  const data = d.data();
  if (!data || data.status !== 'active') return null;

  if (trackView) {
    await d.ref.update({
      viewCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  const { fileStoragePath, ...publicData } = data;
  return { id: d.id, ...publicData, createdAt: isoDate(publicData.createdAt), updatedAt: isoDate(publicData.updatedAt) } as Product;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);

  if (!p) return { title: 'Sản phẩm không tồn tại' };

  return {
    title: p.name,
    description: p.description,
    openGraph: {
      title: p.name,
      description: p.description,
      images: p.thumbnail ? [{ url: p.thumbnail }] : [],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug, true);
  if (!p) return notFound();
  return <ProductDetailClient p={p} />;
}
