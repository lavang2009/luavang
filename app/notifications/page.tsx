'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/features/auth/AuthProvider';
import {api} from '@/lib/client/api';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {dateTime} from '@/lib/utils';
export default function Notifications(){const {user}=useAuth();const [rows,setRows]=useState<any[]>([]);useEffect(()=>{if(user)api<any[]>('/api/notifications').then(setRows)},[user]);return <div className="mx-auto max-w-3xl px-4 py-12 md:px-6"><h1 className="text-4xl font-black">Thông báo</h1><div className="mt-8 space-y-3">{rows.length?rows.map(r=><Card key={r.id} className={`p-5 ${r.read?'opacity-60':'border-cyan-300/20 bg-cyan-300/5'}`}><div className="flex items-start justify-between gap-4"><div><div className="font-semibold">{r.title}</div><div className="mt-1 text-sm text-white/45">{r.message}</div></div><div className="shrink-0 text-xs text-white/30">{dateTime(r.createdAt)}</div></div></Card>):<EmptyState title="Chưa có thông báo"/>}</div></div>}
