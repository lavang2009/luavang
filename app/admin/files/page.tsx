'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/client/api';
import { toast } from 'sonner';

type FileProduct = { id: string; name: string; category: 'file' };
type FileRow = { id:string; name:string; status:string; hasFile:boolean; contentType?:string|null; size:number; downloadCount:number };

export default function FilesAdmin() {
  const [products, setProducts] = useState<FileProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<FileRow[]>([]);

  useEffect(() => {
    Promise.all([
      api<FileProduct[]>('/api/admin/products'),
      api<FileRow[]>('/api/admin/files'),
    ]).then(([productRows, fileRows]) => {
      setProducts(productRows.filter(p => p.category === 'file'));
      setRows(fileRows);
    }).catch(() => { setProducts([]); setRows([]); });
  }, []);

  async function upload() {
    if (!file || !productId || busy) return;
    setBusy(true);

    try {
      const sign = await api<{
        uploadId: string;
        storagePath: string;
        uploadUrl: string;
        expiresInSeconds: number;
      }>('/api/admin/files/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });

      const put = await fetch(sign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!put.ok) throw new Error('Không thể upload file lên Storage.');

      await api('/api/admin/files/commit', {
        method: 'POST',
        body: JSON.stringify({ uploadId: sign.uploadId }),
      });

      toast.success('Đã upload và gắn file private vào sản phẩm.');
      setFile(null);
      const fresh = await api<FileRow[]>('/api/admin/files');
      setRows(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload thất bại.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(productId:string) {
    if (busy || !window.confirm('Xóa file private khỏi sản phẩm này?')) return;
    setBusy(true);
    try {
      await api('/api/admin/files', { method:'DELETE', body: JSON.stringify({ productId }) });
      toast.success('Đã xóa file private.');
      setRows(await api<FileRow[]>('/api/admin/files'));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xóa được file.'); } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Files</h1>
      <Card className="mt-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-white/70">Sản phẩm FILE</span>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
            >
              <option value="">Chọn product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/70">File ≤ 500MB</span>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 text-xs text-white/35">
          Upload trực tiếp vào Firebase Storage bằng signed URL, không đi qua Vercel Function.
        </div>

        <Button className="mt-4" onClick={upload} loading={busy} disabled={!productId || !file || busy}>
          Upload private file
        </Button>
      </Card>
      <div className="mt-6 space-y-3">{rows.map(r => <Card key={r.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold">{r.name}</div><div className="mt-1 text-xs text-white/35">{r.hasFile ? `${r.contentType || 'file'} · ${(r.size/1024/1024).toFixed(2)} MB · ${r.downloadCount} downloads` : 'Chưa có file private'}</div></div>{r.hasFile && <Button variant="danger" onClick={()=>remove(r.id)} disabled={busy}>Xóa file</Button>}</div></Card>)}</div>
    </div>
  );
}
