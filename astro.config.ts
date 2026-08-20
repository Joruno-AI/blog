import { defineConfig, fontProviders, logHandlers } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import unocss from 'unocss/astro'
import astroExpressiveCode from 'astro-expressive-code'
import mdx from '@astrojs/mdx'
import { unified } from '@astrojs/markdown-remark'

import { remarkPlugins, rehypePlugins } from './plugins'
import { SITE } from './src/config'

const sansFallbacks = [
  'ui-sans-serif',
  'system-ui',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
  '"Noto Color Emoji"',
  'sans-serif',
]

const monoFallbacks = [
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  'Consolas',
  '"Liberation Mono"',
  '"Courier New"',
  'monospace',
]

const articleTitleFallbacks = [
  'ui-serif',
  'Songti SC',
  'STSong',
  'SimSun',
  'Georgia',
  'Cambria',
  'Times New Roman',
  'Times',
  'serif',
]

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: SITE.website,
  base: SITE.base,
  build: {
    inlineStylesheets: 'never',
  },
  integrations: [
    sitemap(),
    robotsTxt(),
    unocss({ injectReset: true }),
    astroExpressiveCode(),
    mdx(),
  ],
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: remarkPlugins,
      rehypePlugins: rehypePlugins,
    }),
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-sans',
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin'],
      formats: ['woff2'],
      fallbacks: sansFallbacks,
    },
    {
      provider: fontProviders.fontsource(),
      name: 'DM Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      formats: ['woff2'],
      fallbacks: monoFallbacks,
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Roboto Condensed',
      cssVariable: '--font-condensed',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      formats: ['woff2'],
      fallbacks: sansFallbacks,
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Playfair Display',
      cssVariable: '--font-article-title',
      weights: [400],
      styles: ['italic'],
      subsets: ['latin'],
      formats: ['woff2'],
      fallbacks: articleTitleFallbacks,
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-og-sans',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      formats: ['woff'],
      fallbacks: sansFallbacks,
      options: {
        experimental: {
          variableAxis: {
            opsz: ['24'],
          },
        },
      },
    },
  ],
  image: {
    // https://docs.astro.build/en/guides/images/#responsive-image-behavior
    // Used for all local (except `/public`) and authorized remote images using `![]()` syntax; not configurable per-image
    // Used for all `<Image />` and `<Picture />` components unless overridden with `layout` prop
    layout: 'constrained',
    responsiveStyles: true,
    domains: SITE.imageDomains,
  },
  security: {
    // Allow Giscus iframe to load local styles
    // 1. Allow Giscus through Astro's dev request filter without warning
    allowedDomains: [
      {
        hostname: 'giscus.app',
        protocol: 'https',
      },
    ],
  },
  // 优化预加载策略
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
  vite: {
    logLevel: 'warn',
    server: {
      allowedHosts: ['blog.local', '.localcan.dev'],
      headers: {
        // 2. Satisfy the browser's CORS check for Giscus theme CSS and fonts
        'Access-Control-Allow-Origin': 'https://giscus.app',
      },
      // Increase timeout for large MDX files
      watch: {
        usePolling: false,
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      // 优化代码分割
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 将大型第三方库分离
            if (id.includes('/node_modules/three/')) return 'vendor-three'
            if (id.includes('/node_modules/katex/')) return 'vendor-katex'
          },
        },
      },
    },
    // Optimize MDX processing
    optimizeDeps: {
      exclude: ['@astrojs/mdx'],
    },
  },
  logger: logHandlers.node({ level: 'info' }),
  experimental: {
    contentIntellisense: true,
    chromeDevtoolsWorkspace: true,
  },
})
