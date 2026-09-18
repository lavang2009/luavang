import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (!base) return [];
  return ['', '/shop', '/login', '/register', '/deposit', '/faq'].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date()
  }));
}
