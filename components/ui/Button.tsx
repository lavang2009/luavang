'use client';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export const Button=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement> & { variant?:'primary'|'secondary'|'ghost'|'danger'; loading?:boolean }>(function Button({variant='primary',loading=false,className='',children,disabled,...props},ref){
 const v={primary:'bg-linear-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-neon hover:brightness-110',secondary:'bg-white/8 border border-white/15 text-white hover:bg-white/12',ghost:'bg-transparent text-white/80 hover:text-white hover:bg-white/8',danger:'bg-rose-500/15 border border-rose-400/30 text-rose-100 hover:bg-rose-500/25'}[variant];
 return <button ref={ref} disabled={disabled||loading} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} {...props}>{loading&&<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>}{children}</button>
});
