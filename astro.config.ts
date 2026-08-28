import { defineConfig, fontProviders, logHandlers } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import unocss from 'unocss/astro'
import astroExpressiveCode from 'astro-expressive-code'
import mdx from '@astrojs/mdx'
import { unified } from '@astrojs/markdown-remark'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { remarkPlugins, rehypePlugins } from './plugins'
import { fetchZReadPage, fetchZReadStructure } from './functions/_shared/zread'
import { SITE } from './src/config'

const sansFallbacks = [
  '-apple-system',
  'system-ui',
  '"Segoe UI"',
  'Roboto',
  '"Noto Sans SC"',
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei"',
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
  '"Instrument Serif"',
  'Songti SC',
  'STSong',
  'SimSun',
  'Georgia',
  'Cambria',
  'Times New Roman',
  'Times',
  'serif',
]

interface DevServerLike {
  middlewares: {
    use(
      handler: (
        request: IncomingMessage,
        response: ServerResponse,
        next: () => void
      ) => void
    ): void
  }
}

function zreadDevApi() {
  return {
    name: 'zread-dev-api',
    configureServer(server: DevServerLike) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/zread/')) return next()

        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: '仅支持 GET 请求。' }))
          return
        }

        const pathParts = url.pathname.split('/').filter(Boolean)
        const owner = pathParts[2] || ''
        const repo = pathParts[3] || ''
        const action = pathParts[4] || 'overview'
        const valid = /^[A-Za-z0-9_.-]{1,100}$/
        if (!valid.test(owner) || !valid.test(repo)) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: '仓库地址不合法。' }))
          return
        }

        try {
          const payload =
            action === 'structure'
              ? await fetchZReadStructure(owner, repo)
              : action === 'overview' || action === 'page'
                ? await fetchZReadPage(
                    owner,
                    repo,
                    action === 'overview'
                      ? 'Overview'
                      : url.searchParams.get('title') || 'Overview'
                  )
                : null
          if (!payload) {
            response.statusCode = 404
            response.end(JSON.stringify({ error: '不支持的 ZRead 操作。' }))
            return
          }
          response.statusCode = 200
          response.end(JSON.stringify(payload))
        } catch (error) {
          response.statusCode = 502
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : 'ZRead 中文文档加载失败。',
            })
          )
        }
      })
    },
  }
}

const AGENT_RESERVED_ROUTES = new Set([
  'all',
  'about',
  'analyzer',
  'compare',
  'masters',
  'repository',
  'scenes',
  'trending',
])

function agentRepositoryDevFallback() {
  return {
    name: 'agent-repository-dev-fallback',
    configureServer(server: DevServerLike) {
      server.middlewares.use((request, _response, next) => {
        if (request.method !== 'GET') return next()

        const url = new URL(request.url || '/', 'http://localhost')
        const parts = url.pathname.split('/').filter(Boolean)
        const [section, owner = '', repo = ''] = parts
        const repositoryPart = /^[A-Za-z0-9_.-]{1,100}$/
        if (
          section !== 'agent' ||
          parts.length < 3 ||
          AGENT_RESERVED_ROUTES.has(owner) ||
          !repositoryPart.test(owner) ||
          !repositoryPart.test(repo)
        )
          return next()

        // Cloudflare Pages uses functions/agent/[[id]].ts as the production
        // fallback. Astro dev does not execute Pages Functions, so mirror the
        // same rewrite locally while preserving the public owner/repo URL.
        request.url = `/agent/repository/${url.search}`
        next()
      })
    },
  }
}

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
      styles: ['italic'],
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
      styles: ['normal'],
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
    plugins: [zreadDevApi(), agentRepositoryDevFallback()],
    logLevel: 'warn',
    // The dependency graph is mounted imperatively from a lazy TSX module,
    // rather than rendered as an Astro React island. Compile that module with
    // React's automatic JSX runtime without enabling Fast Refresh, whose
    // island preamble is intentionally absent on this page.
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
    server: {
      allowedHosts: ['blog.local', '.localcan.dev'],
      headers: {
        // 2. Satisfy the browser's CORS check for Giscus theme CSS and fonts
        'Access-Control-Allow-Origin': 'https://giscus.app',
      },
      // /api/* 由 Cloudflare Pages Functions 提供, astro dev 不执行 functions/,
      // 本地必须转发到线上, 否则 /agent 详情页正文与抽屉全部 404
      proxy: {
        '/api': {
          target: SITE.website,
          changeOrigin: true,
        },
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
      // The repository reader lazy-loads Markdown, graph, syntax-highlighting
      // and CodeMirror modules. Pre-bundle the complete client graph at dev
      // startup so opening the page or its first file cannot race Vite's
      // optimizer and return a wave of "Outdated Optimize Dep" 504s.
      include: [
        'dompurify',
        'marked',
        'mermaid',
        'shiki/bundle/full',
        'react',
        'react/jsx-dev-runtime',
        'react/jsx-runtime',
        'react-dom/client',
        '@dagrejs/dagre',
        '@xyflow/react',
        'codemirror',
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/lang-css',
        '@codemirror/lang-html',
        '@codemirror/lang-javascript',
        '@codemirror/lang-json',
        '@codemirror/lang-markdown',
        '@codemirror/lang-python',
        '@codemirror/lang-sql',
        '@codemirror/lang-xml',
        '@codemirror/lang-yaml',
        '@codemirror/legacy-modes/mode/clike',
        '@codemirror/legacy-modes/mode/dockerfile',
        '@codemirror/legacy-modes/mode/go',
        '@codemirror/legacy-modes/mode/ruby',
        '@codemirror/legacy-modes/mode/rust',
        '@codemirror/legacy-modes/mode/shell',
        '@codemirror/legacy-modes/mode/swift',
        '@codemirror/legacy-modes/mode/toml',
        '@lezer/highlight',
      ],
    },
  },
  logger: logHandlers.node({ level: 'info' }),
  experimental: {
    contentIntellisense: true,
    chromeDevtoolsWorkspace: true,
  },
})
