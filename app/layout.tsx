import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import './astro-parity.css'

const inter = {
  variable: '--font-sans',
}

export const metadata: Metadata = {
  title: {
    default: 'Joruno',
    template: '%s - Joruno',
  },
  description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
  metadataBase: new URL('https://wangshengliang.cn'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
