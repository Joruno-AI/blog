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
): string | null {
  if (!href) return null
  const trimmed = href.trim()
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return null
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('#') || trimmed.startsWith('mailto:')) return trimmed
  const path = trimmed.replace(/^\.\//, '').replace(/^\//, '')
  return kind === 'img'
    ? `https://raw.githubusercontent.com/${repo}/HEAD/${path}`
    : `https://github.com/${repo}/blob/HEAD/${path}`
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
        const url = resolveUrl(href, repoFullName, 'link')
        const inner = this.parser.parseInline(tokens)
        if (!url) return inner
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener nofollow">${inner}</a>`
      },
      image({ href, title, text }) {
        const url = resolveUrl(href, repoFullName, 'img')
        if (!url) return escapeHtml(text)
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async">`
      },
    },
  })
  return marked.parse(markdown, { async: true })
}
