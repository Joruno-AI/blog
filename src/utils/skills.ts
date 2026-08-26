export const SKILL_CATEGORIES = [
  'claude-skill',
  'codex-skill',
  'mcp-server',
  'agent-tool',
] as const

export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  'claude-skill': 'Claude Skills',
  'codex-skill': 'Codex Skills',
  'mcp-server': 'MCP Servers',
  'agent-tool': 'Agent Tools',
}

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  'claude-skill': 'i-ri-sparkling-2-line',
  'codex-skill': 'i-ri-terminal-box-line',
  'mcp-server': 'i-ri-plug-line',
  'agent-tool': 'i-ri-robot-2-line',
}

/** npx skills add 仅适用于 skill 类目, 其余类目引导到 GitHub */
export const INSTALLABLE_CATEGORIES: ReadonlySet<string> = new Set([
  'claude-skill',
  'codex-skill',
])

export function installCommand(repoFullName: string) {
  return `npx skills add ${repoFullName}`
}

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

export const SECURITY_GRADES: Record<
  string,
  { label: string; color: string }
> = {
  safe: { label: '安全', color: '#22c55e' },
  caution: { label: '谨慎', color: '#f59e0b' },
  unknown: { label: '未评级', color: '#9ca3af' },
}

export function githubAvatar(author: string, size = 96) {
  return `https://github.com/${author}.png?size=${size}`
}

/* 全量索引条目 (public/skills/full-index.json 的 items) */
export interface FullIndexItem {
  f: string
  n: string
  a: string
  s: number
  d: string
  c: string
  q: number
  g: string
}

/** 场景关键词匹配: 命中名称/描述任一关键词即算匹配 */
export function matchScene(item: FullIndexItem, keywords: string[]) {
  const haystack = `${item.n} ${item.d}`.toLowerCase()
  return keywords.some((k) => haystack.includes(k.toLowerCase()))
}
