import { gunzipSync } from 'node:zlib'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const INDEX_URL = 'https://agentskillshub.top/search-index.json.gz'
const INSTALLS_API = 'https://skills.sh/api/search'
const RAW_BASE = 'https://raw.githubusercontent.com'
const USER_AGENT = 'wangshengliang-blog-skills-sync'

const CATEGORIES = ['claude-skill', 'codex-skill', 'mcp-server', 'agent-tool']
const SKILL_CATEGORIES = new Set(['claude-skill', 'codex-skill'])
// 页面已知分类, 上游新增的未知分类 (如 education/youmind-plugin) 归入 uncategorized
const KNOWN_CATEGORIES = new Set([
  'claude-skill',
  'codex-skill',
  'mcp-server',
  'agent-tool',
  'ai-skill',
  'llm-plugin',
  'uncategorized',
])
const EXCLUDED_GRADES = new Set(['unsafe', 'reject'])
const TOP_N = 100
const README_MAX_CHARS = 15000
const CONCURRENCY = 8

const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(scriptDir, '../src/content/skills/data.json')
const metaPath = resolve(scriptDir, '../src/content/skills/meta.json')
const readmeDir = resolve(scriptDir, '../src/data/skills-readmes')
const fullIndexPath = resolve(scriptDir, '../public/agent/full-index.json')
const starHistoryPath = resolve(
  scriptDir,
  '../src/data/skills-star-history.json'
)

// 读取 .env 里的 GITHUB_TOKEN (脚本可能不经 --env-file 启动)
function readEnvToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  const envPath = resolve(scriptDir, '../.env')
  if (!existsSync(envPath)) return ''
  const match = readFileSync(envPath, 'utf8').match(/^GITHUB_TOKEN=(.+)$/m)
  return match ? match[1].trim() : ''
}
const githubToken = readEnvToken()

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'User-Agent': USER_AGENT, ...options.headers },
      })
      if (response.ok) return response
      if (response.status === 404) return null
      if (response.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
        continue
      }
      throw new Error(`HTTP ${response.status}: ${url}`)
    } catch (error) {
      if (attempt >= retries) throw error
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++
        results[index] = await task(items[index], index)
      }
    }
  )
  await Promise.all(workers)
  return results
}

console.log(`[sync-skills] 下载索引 ${INDEX_URL}`)
const indexResponse = await fetchWithRetry(INDEX_URL)
if (!indexResponse) throw new Error('索引文件不存在 (404)')
const indexBuffer = Buffer.from(await indexResponse.arrayBuffer())
const index = JSON.parse(gunzipSync(indexBuffer).toString('utf8'))
console.log(
  `[sync-skills] 索引共 ${index.count} 条, 生成于 ${index.generated_at}`
)

const selected = CATEGORIES.flatMap((category) =>
  index.skills
    .filter((s) => s.c === category && !EXCLUDED_GRADES.has(s.g))
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_N)
)
console.log(`[sync-skills] 筛选出 ${selected.length} 条 (每类 top ${TOP_N})`)

// 全量精简索引: 供 /agent/all 客户端分页搜索与场景页构建端匹配
const fullIndex = index.skills
  .filter((s) => !EXCLUDED_GRADES.has(s.g))
  .sort((a, b) => b.s - a.s)
  .map((s) => ({
    f: s.f,
    n: s.n,
    a: s.a,
    s: s.s,
    d: (s.d || '').slice(0, 140),
    c: KNOWN_CATEGORIES.has(s.c) ? s.c : 'uncategorized',
    q: Math.round(s.q * 10) / 10,
    g: s.g,
  }))
await mkdir(dirname(fullIndexPath), { recursive: true })
await writeFile(
  fullIndexPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), items: fullIndex })
)
console.log(
  `[sync-skills] 全量索引 ${fullIndex.length} 条写入 public/agent/full-index.json`
)

// star 历史快照: 记录精选项目的每日 star 数, 用于计算增速
const today = new Date().toISOString().slice(0, 10)
const starHistory = existsSync(starHistoryPath)
  ? JSON.parse(readFileSync(starHistoryPath, 'utf8'))
  : {}
starHistory[today] = Object.fromEntries(selected.map((s) => [s.f, s.s]))
const cutoff = new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10)
for (const day of Object.keys(starHistory)) {
  if (day < cutoff) delete starHistory[day]
}
await writeFile(starHistoryPath, `${JSON.stringify(starHistory)}\n`)
const pastDays = Object.keys(starHistory)
  .filter((day) => day < today)
  .sort()
const baselineDay =
  pastDays.find(
    (day) =>
      day <= new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10)
  ) ?? pastDays[0]
const baseline = baselineDay ? starHistory[baselineDay] : null
console.log(
  `[sync-skills] star 快照 ${today} 已记录, 增速基线: ${baselineDay ?? '无 (首次运行)'}`
)

// 现有 data.json 里的 GitHub 字段, 作为补数失败时的回退 (禁止用 null 覆盖已有数据)
const previousGithubMeta = new Map()
if (existsSync(dataPath)) {
  try {
    for (const entry of JSON.parse(readFileSync(dataPath, 'utf8'))) {
      if (entry?.id && (entry.pushedAt || entry.createdAt || entry.language)) {
        previousGithubMeta.set(entry.id, {
          pushedAt: entry.pushedAt ?? null,
          createdAt: entry.createdAt ?? null,
          language: entry.language ?? null,
        })
      }
    }
  } catch {
    console.warn('[sync-skills] 现有 data.json 解析失败, 跳过 GitHub 字段回退')
  }
}

// GitHub API 补充仓库元数据 (需 GITHUB_TOKEN)
const githubMeta = new Map()
if (githubToken) {
  console.log(`[sync-skills] GitHub API 补数: ${selected.length} 个仓库`)
  let ghFound = 0
  await mapWithConcurrency(selected, CONCURRENCY, async (item) => {
    try {
      const response = await fetchWithRetry(
        `https://api.github.com/repos/${item.f}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${githubToken}`,
          },
        },
        1
      )
      if (!response) return
      const repo = await response.json()
      githubMeta.set(item.f, {
        pushedAt: repo.pushed_at ?? null,
        createdAt: repo.created_at ?? null,
        language: repo.language ?? null,
      })
      ghFound++
    } catch (error) {
      console.warn(`[sync-skills] GitHub 补数失败 ${item.f}: ${error.message}`)
    }
  })
  console.log(`[sync-skills] GitHub 补数成功: ${ghFound}/${selected.length}`)
  if (ghFound === 0) {
    console.warn(
      '[sync-skills] GitHub 补数全部失败 (网络不通?), 将复用 data.json 中已有的 pushedAt/createdAt/language'
    )
  }
} else {
  console.warn(
    '[sync-skills] 未配置 GITHUB_TOKEN, 跳过仓库元数据 (最近更新/语言) 补数'
  )
}

// skills.sh 安装量: 仅 skill 类目可通过 npx skills add 安装, 逐仓库查询后按 source 聚合
// skills.sh 限流较严, 低并发 + 请求间隔, 429 时指数退避
// SKIP_INSTALLS=1 时复用现有 data.json 里的安装量, 不再请求
const installTargets = selected.filter((s) => SKILL_CATEGORIES.has(s.c))
let installsFound = 0
const installsMap = new Map()
if (process.env.SKIP_INSTALLS === '1' && existsSync(dataPath)) {
  const prev = JSON.parse(readFileSync(dataPath, 'utf8'))
  for (const item of prev) {
    if (item.installs != null) installsMap.set(item.id, item.installs)
  }
  console.log(
    `[sync-skills] SKIP_INSTALLS=1, 复用已有安装量 ${installsMap.size} 条`
  )
} else {
  console.log(
    `[sync-skills] 查询 skills.sh 安装量: ${installTargets.length} 个仓库`
  )
  await mapWithConcurrency(installTargets, 2, async (item) => {
    const query = item.n.length >= 2 ? item.n : item.a
    const url = `${INSTALLS_API}?q=${encodeURIComponent(query)}&owner=${encodeURIComponent(item.a)}&limit=100`
    try {
      const response = await fetchWithRetry(url, {}, 4)
      if (!response) return
      const payload = await response.json()
      const total = (payload.skills || [])
        .filter((s) => (s.source || '').toLowerCase() === item.f.toLowerCase())
        .reduce((sum, s) => sum + (s.installs || 0), 0)
      if (total > 0) {
        installsMap.set(item.f, total)
        installsFound++
      }
    } catch (error) {
      console.warn(`[sync-skills] 安装量查询失败 ${item.f}: ${error.message}`)
    }
    await new Promise((r) => setTimeout(r, 300))
  })
  console.log(
    `[sync-skills] 拿到安装量的仓库: ${installsFound}/${installTargets.length}`
  )
}

const skipReadme = process.env.SKIP_README === '1'
if (skipReadme) {
  console.log('[sync-skills] SKIP_README=1, 跳过 README 抓取')
} else {
  console.log(`[sync-skills] 抓取 README: ${selected.length} 个仓库`)
  await rm(readmeDir, { recursive: true, force: true })
  await mkdir(readmeDir, { recursive: true })
  let readmesFound = 0
  await mapWithConcurrency(selected, CONCURRENCY, async (item) => {
    for (const filename of ['README.md', 'readme.md', 'README.zh-CN.md']) {
      try {
        const response = await fetchWithRetry(
          `${RAW_BASE}/${item.f}/HEAD/${filename}`,
          {},
          0
        )
        if (!response) continue
        let text = await response.text()
        if (text.length > README_MAX_CHARS) {
          text = `${text.slice(0, README_MAX_CHARS)}\n\n> _README 过长已截断, 完整内容请查看 GitHub 仓库。_\n`
        }
        await writeFile(
          resolve(readmeDir, `${item.f.replace('/', '__')}.md`),
          text
        )
        readmesFound++
        return
      } catch {
        // 尝试下一个文件名
      }
    }
  })
  console.log(
    `[sync-skills] 拿到 README 的仓库: ${readmesFound}/${selected.length}`
  )
}

const keywordsOf = (item) => {
  const tokens = [...new Set(item.wk || [])]
  return tokens.join(' ').slice(0, 120)
}

// 中文精简描述人工维护在 desc-zh.json (id -> 中文一句话), 同步时合并进 data.json
const descZhPath = resolve(scriptDir, '../src/content/skills/desc-zh.json')
const descZhMap = existsSync(descZhPath)
  ? JSON.parse(readFileSync(descZhPath, 'utf8'))
  : {}
const hasCjk = (s) => /[一-鿿]/.test(s || '')

const entries = selected.map((item) => ({
  id: item.f,
  name: item.n,
  author: item.a,
  desc: item.d || '',
  descZh: descZhMap[item.f] || (hasCjk(item.d) ? item.d : ''),
  category: item.c,
  stars: item.s,
  installs: installsMap.get(item.f) ?? null,
  qualityScore: Math.round(item.q * 10) / 10,
  securityGrade: item.g,
  platforms: item.p || [],
  tags: (item.t || []).slice(0, 6),
  official: Boolean(item.o),
  keywords: keywordsOf(item),
  pushedAt:
    githubMeta.get(item.f)?.pushedAt ??
    previousGithubMeta.get(item.f)?.pushedAt ??
    null,
  createdAt:
    githubMeta.get(item.f)?.createdAt ??
    previousGithubMeta.get(item.f)?.createdAt ??
    null,
  language:
    githubMeta.get(item.f)?.language ??
    previousGithubMeta.get(item.f)?.language ??
    null,
  starsDelta: baseline?.[item.f] != null ? item.s - baseline[item.f] : null,
}))

const untranslated = entries.filter((e) => !e.descZh)
if (untranslated.length > 0) {
  console.warn(
    `[sync-skills] ${untranslated.length} 条缺少中文描述, 需补充 desc-zh.json:`,
    untranslated
      .slice(0, 10)
      .map((e) => e.id)
      .join(', '),
    untranslated.length > 10 ? '...' : ''
  )
}

await mkdir(dirname(dataPath), { recursive: true })
await writeFile(dataPath, `${JSON.stringify(entries, null, 2)}\n`)
await writeFile(
  metaPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      indexGeneratedAt: index.generated_at,
      indexTotalCount: index.count,
      selectedCount: entries.length,
      topPerCategory: TOP_N,
    },
    null,
    2
  )}\n`
)
console.log(`[sync-skills] 完成: ${entries.length} 条写入 ${dataPath}`)
