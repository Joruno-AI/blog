import { Marked } from 'marked'

/**
 * 安全渲染第三方仓库 README:
 * - 原生 HTML 全部剥标签转义, 只保留文本 (防 XSS, 不引入 sanitizer 依赖)
 * - 链接协议白名单, 拦截 javascript:/data: 等
 * - 相对路径改写为 GitHub 绝对地址 (图片走 raw, 链接走 blob)
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resolveUrl(
  href: string | null | undefined,
  repo: string,
  kind: 'link' | 'img'
): { url: string; external: boolean } | null {
  if (!href) return null
  const trimmed = href.trim()
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return null
  if (trimmed.startsWith('#')) return { url: trimmed, external: false }
  if (trimmed.startsWith('mailto:')) return { url: trimmed, external: true }

  if (/^(https?:)?\/\//i.test(trimmed)) {
    if (kind === 'link') {
      try {
        const absolute = new URL(
          trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
        )
        const [owner, name] = repo.split('/')
        const parts = absolute.pathname.split('/').filter(Boolean)
        if (
          absolute.hostname === 'github.com' &&
          parts[0]?.toLowerCase() === owner?.toLowerCase() &&
          parts[1]?.toLowerCase() === name?.toLowerCase()
        ) {
          if (parts.length === 2) {
            return {
              url: `/agent/${repo}/`,
              external: false,
            }
          }
          if ((parts[2] !== 'blob' && parts[2] !== 'tree') || parts.length < 5)
            return { url: trimmed, external: true }
          const ref = parts[3]
          const path = parts.slice(4).join('/')
          return {
            url: `/agent/${repo}/blob/${encodeURIComponent(ref)}/${path}`,
            external: false,
          }
        }
      } catch {
        // Invalid absolute URLs are dropped below.
        return null
      }
    }
    return { url: trimmed, external: true }
  }

  const path = trimmed.replace(/^\.\//, '').replace(/^\//, '')
  return kind === 'img'
    ? {
        url: `https://raw.githubusercontent.com/${repo}/HEAD/${path}`,
        external: true,
      }
    : {
        url: `/agent/${repo}/blob/HEAD/${path}`,
        external: false,
      }
}

export async function renderReadme(markdown: string, repoFullName: string) {
  const marked = new Marked({
    gfm: true,
    renderer: {
      html({ text }) {
        const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
        const escaped = escapeHtml(stripped.trim())
        return escaped ? `${escaped} ` : ''
      },
      link({ href, title, tokens }) {
        const resolved = resolveUrl(href, repoFullName, 'link')
        const inner = this.parser.parseInline(tokens)
        if (!resolved) return inner
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        const externalAttrs = resolved.external
          ? ' target="_blank" rel="noopener nofollow"'
          : ''
        return `<a href="${escapeHtml(resolved.url)}"${titleAttr}${externalAttrs}>${inner}</a>`
      },
      image({ href, title, text }) {
        const resolved = resolveUrl(href, repoFullName, 'img')
        if (!resolved) return escapeHtml(text)
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        return `<img src="${escapeHtml(resolved.url)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async">`
      },
    },
  })
  return marked.parse(markdown, { async: true })
}
