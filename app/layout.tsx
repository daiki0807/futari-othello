import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'ふたりのオセロ',description:'2人対戦と3段階のコンピューター対戦が楽しめるオセロ。置ける場所の目印と、自動反転・自動パスつき。',icons:{icon:process.env.GITHUB_PAGES === 'true' ? '/futari-othello/favicon.svg' : '/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
