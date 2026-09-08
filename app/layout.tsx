import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'ふたりのオセロ',description:'1台の端末で交互に遊べるオセロ。置ける場所の目印と、自動反転・自動パスつき。',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
