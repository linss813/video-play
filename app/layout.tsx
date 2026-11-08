import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'映界 CineAtlas · 你的影视探索空间',description:'自定义来源，聚合搜索，随心观看。个人影视搜索与播放器。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
