import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'オセロと将棋',description:'オセロと将棋を2人または3段階のCPUと対戦。将棋は駒を動かして学べるチュートリアルつき。',icons:{icon:process.env.GITHUB_PAGES === 'true' ? '/futari-othello/favicon.svg' : '/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
