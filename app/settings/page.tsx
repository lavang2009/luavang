'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthProvider';
import { api } from '@/lib/client/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { toast } from 'sonner';

export default function Settings() {
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<any>('/api/users/me').then(data => {
      setDisplayName(data.displayName || data.username || '');
      setPhotoURL(data.photoURL || '');
    }).catch(() => {});
  }, [user]);

  async function save() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await api('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, photoURL: photoURL || null }),
      });
      await user.reload();
      toast.success('Đã cập nhật cài đặt tài khoản.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể cập nhật.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div><div className="text-xs uppercase tracking-[.2em] text-fuchsia-300/70">SETTINGS</div><h1 className="mt-2 text-4xl font-black">Cài đặt tài khoản</h1></div>
        <Link href="/profile" className="text-sm text-white/45 hover:text-white">← Hồ sơ</Link>
      </div>
      <Card className="mt-8 p-6">
        <div className="grid gap-4">
          <Input label="Tên hiển thị" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={64} />
          <Input label="Avatar HTTPS (tuỳ chọn)" value={photoURL} onChange={e => setPhotoURL(e.target.value)} />
          <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-xs leading-5 text-white/45">
            Mật khẩu không được lưu vào Firestore. Dùng chức năng khôi phục Firebase Authentication để đổi mật khẩu.
          </div>
          <Link href="/forgot-password" className="text-sm text-cyan-300 hover:text-cyan-200">Đặt lại mật khẩu →</Link>
          <Button onClick={save} loading={busy}>Lưu thay đổi</Button>
        </div>
      </Card>
    </div>
  );
}
