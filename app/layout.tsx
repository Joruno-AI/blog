import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = {
  variable: '--font-sans',
}

export const metadata: Metadata = {
  generator: 'Astro v7.0.7',
  title: {
    default: 'Joruno',
    template: '%s - Joruno',
  },
  description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
  metadataBase: new URL('https://wangshengliang.cn'),
  applicationName: 'Joruno',
  authors: [{ name: 'Joruno Jobāna', url: 'https://wangshengliang.cn/' }],
  creator: 'Joruno Jobāna',
  publisher: 'Joruno',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/rss.xml' },
  },
  manifest: '/app.webmanifest',
  icons: {
    icon: [{ url: '/joruno.ico', sizes: '32x32' }, { url: '/joruno.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/joruno.png' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Joruno',
    description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
    siteName: 'wangshengliang.cn',
    locale: 'zh_CN',
    images: [{ url: '/og-images/og-image.png', width: 1200, height: 630, alt: 'Joruno' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Joruno',
    description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
    images: [{ url: '/og-images/og-image.png', alt: 'Joruno' }],
  },
  other: {
    'format-detection': 'telephone=no',
    'twitter:url': 'https://wangshengliang.cn/',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Joruno',
  url: 'https://wangshengliang.cn/',
  description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
  author: { '@type': 'Person', name: 'Joruno Jobāna' },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: 'https://wangshengliang.cn/blog/?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hans" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="" />
        <meta name="theme-color" content="" />
        <script
          id="theme-bootstrap"
          data-theme-bootstrap="executable"
          dangerouslySetInnerHTML={{
            __html: `;(() => {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
              let theme = prefersDark ? 'dark' : 'light'
              try {
                theme = localStorage.getItem('theme') || theme
                localStorage.setItem('theme', theme)
              } catch {}
              document.documentElement.classList.toggle('dark', theme === 'dark')
              document.querySelector("meta[name='color-scheme']")?.setAttribute('content', theme === 'dark' ? 'dark light' : 'light dark')
              document.querySelector("meta[name='theme-color']")?.setAttribute('content', theme === 'dark' ? '#171411' : '#fbf7ef')
            })()`,
          }}
        />
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
