import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { RegisterForm } from '@/features/auth/AuthForms';
export default function Page(){return <div className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-12"><Card className="w-full p-6 shadow-neon md:p-8"><div className="mb-6"><div className="text-xs uppercase tracking-[.24em] text-fuchsia-300/70">LÙ A VANG</div><h1 className="mt-2 text-3xl font-black">Tạo tài khoản</h1></div><RegisterForm/><div className="mt-6 text-center text-sm text-white/45">Đã có tài khoản? <Link href="/login" className="text-cyan-300 hover:text-cyan-200">Đăng nhập</Link></div></Card></div>}
