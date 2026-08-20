import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OWNER = 'lm-rebooter'
const REPO = 'NuggetsBooklet'
const BRANCH = 'master'
const SOURCE_ID = 'nuggets'
const SOURCE_NAME = '掘金小册'
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`
const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDir, '../src/data/nuggets-catalog.json')
const githubToken = process.env.NUGGETS_GITHUB_TOKEN
const treeFile = process.env.NUGGETS_TREE_FILE
const pinnedCommit = process.env.NUGGETS_COMMIT

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
})

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'wangshengliang-blog-nuggets-sync',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${url}`)
  }

  return response.json()
}

function stableId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function titleFromPath(path) {
  const filename = path.split('/').at(-1) || path
  return filename.replace(/\.md$/i, '').trim()
}

let commit
let treeData

if (treeFile && pinnedCommit) {
  commit = pinnedCommit
  treeData = JSON.parse(await readFile(treeFile, 'utf8'))
} else {
  const commitData = await fetchJson(`${API_BASE}/commits/${BRANCH}`)
  commit = commitData.sha
  const treeSha = commitData.commit.tree.sha
  treeData = await fetchJson(`${API_BASE}/git/trees/${treeSha}?recursive=1`)
}

if (treeData.truncated) {
  throw new Error('GitHub tree response was truncated; catalog is incomplete.')
}

const courses = new Map()

for (const entry of treeData.tree) {
  if (entry.type !== 'blob' || !entry.path.endsWith('.md')) continue

  const parts = entry.path.split('/')
  if (parts.length < 2) continue

  const courseName = parts[0]?.trim()
  if (!courseName) continue

  let course = courses.get(courseName)
  if (!course) {
    course = {
      id: stableId(`${SOURCE_ID}:${courseName}`),
      sourceId: SOURCE_ID,
      name: courseName,
      path: courseName,
      articles: [],
    }
    courses.set(courseName, course)
  }

  course.articles.push({
    title: titleFromPath(entry.path),
    path: entry.path,
    bytes: entry.size || 0,
  })
}

const normalizedCourses = [...courses.values()]
  .sort((a, b) => collator.compare(a.name, b.name))
  .map((course) => ({
    ...course,
    articles: course.articles.sort((a, b) =>
      collator.compare(a.title, b.title)
    ),
  }))

const articleCount = normalizedCourses.reduce(
  (total, course) => total + course.articles.length,
  0
)

const catalog = {
  sourceId: SOURCE_ID,
  sourceName: SOURCE_NAME,
  source: `https://github.com/${OWNER}/${REPO}`,
  repository: `${OWNER}/${REPO}`,
  branch: BRANCH,
  commit,
  generatedAt: new Date().toISOString(),
  stats: {
    categories: 1,
    courses: normalizedCourses.length,
    articles: articleCount,
  },
  categories: [
    {
      id: 'nuggets-booklet',
      name: SOURCE_NAME,
      courseCount: normalizedCourses.length,
      articleCount,
      courses: normalizedCourses,
    },
  ],
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(catalog)}\n`)

console.log(
  `Synced ${catalog.stats.courses} booklets and ${catalog.stats.articles} articles ` +
    `at ${commit.slice(0, 12)}.`
)
