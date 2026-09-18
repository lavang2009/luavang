import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BackgroundFX } from '@/components/layout/BackgroundFX';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Toaster } from 'sonner';
export const metadata: Metadata={title:{default:'Lù A Vang — ACC + FILE DIGITAL',template:'%s | Lù A Vang'},description:'Lù A Vang — nền tảng thương mại điện tử ACC + FILE DIGITAL.',openGraph:{title:'Lù A Vang',description:'ACC + FILE DIGITAL',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body><AuthProvider><BackgroundFX/><Navbar/><main className="min-h-[70vh]">{children}</main><Footer/><Toaster theme="dark" position="top-right"/></AuthProvider></body></html>}
