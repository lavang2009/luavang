import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ok, handleApiError } from '@/lib/server/http';
import { slugify, safeImageUrl } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000),
  category: z.enum(['acc', 'file']),
  price: z.number().int().nonnegative().max(1_000_000_000),
  originalPrice: z.number().int().nonnegative().max(1_000_000_000),
  thumbnail: z.string().url().refine(v => safeImageUrl(v) !== '', 'Thumbnail phải là URL HTTPS an toàn.'),
  featured: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const s = await adminDb().collection('products').orderBy('createdAt', 'desc').limit(200).get();
    return ok(s.docs.map(d => ({ id: d.id, ...d.data(), fileStoragePath: undefined })));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = schema.parse(await req.json());
    const id = adminDb().collection('products').doc().id;
    const discount = b.originalPrice > 0
      ? Math.max(0, Math.round((1 - b.price / b.originalPrice) * 100))
      : 0;

    await adminDb().collection('products').doc(id).set({
      id,
      name: b.name,
      slug: `${slugify(b.name)}-${id.slice(0, 6)}`,
      description: b.description,
      category: b.category,
      price: b.price,
      originalPrice: b.originalPrice,
      discount,
      thumbnail: b.thumbnail,
      images: [b.thumbnail],
      fileStoragePath: null,
      inventoryCount: 0,
      soldCount: 0,
      viewCount: 0,
      downloadCount: 0,
      status: 'active',
      featured: b.featured,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return ok({ id }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
