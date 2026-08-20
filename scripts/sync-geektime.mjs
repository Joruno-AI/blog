import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OWNER = 'uaxe'
const REPO = 'geektime-docs'
const BRANCH = 'master'
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`
const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDir, '../src/data/geektime-catalog.json')
const githubToken = process.env.GEEKTIME_GITHUB_TOKEN
const treeFile = process.env.GEEKTIME_TREE_FILE
const pinnedCommit = process.env.GEEKTIME_COMMIT

const categoryIds = new Map([
  ['AI-大数据', 'ai-data'],
  ['产品-运营', 'product-operations'],
  ['前端-移动', 'frontend-mobile'],
  ['后端-架构', 'backend-architecture'],
  ['管理-成长', 'management-growth'],
  ['计算机基础', 'computer-science'],
  ['运维-测试', 'operations-testing'],
])

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
})

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'wangshengliang-blog-geektime-sync',
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

const categories = new Map()

for (const entry of treeData.tree) {
  if (entry.type !== 'blob' || !entry.path.endsWith('.md')) continue

  const parts = entry.path.split('/')
  const [categoryName, courseName, docsDirectory] = parts

  if (!categoryName || !courseName || docsDirectory !== 'docs') continue
  if (parts.length < 4) continue

  const filename = parts.at(-1)
  if (filename === 'index.md' || filename === `${courseName}.md`) continue

  let category = categories.get(categoryName)
  if (!category) {
    category = {
      id: categoryIds.get(categoryName) || stableId(categoryName),
      name: categoryName,
      courses: new Map(),
    }
    categories.set(categoryName, category)
  }

  let course = category.courses.get(courseName)
  if (!course) {
    const coursePath = `${categoryName}/${courseName}`
    course = {
      id: stableId(coursePath),
      name: courseName,
      path: coursePath,
      articles: [],
    }
    category.courses.set(courseName, course)
  }

  course.articles.push({
    title: titleFromPath(entry.path),
    path: entry.path,
    bytes: entry.size || 0,
  })
}

const normalizedCategories = [...categories.values()]
  .sort((a, b) => {
    const aIndex = [...categoryIds.keys()].indexOf(a.name)
    const bIndex = [...categoryIds.keys()].indexOf(b.name)
    return aIndex - bIndex
  })
  .map((category) => {
    const courses = [...category.courses.values()]
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((course) => ({
        ...course,
        articles: course.articles.sort((a, b) =>
          collator.compare(a.title, b.title)
        ),
      }))

    return {
      id: category.id,
      name: category.name,
      courseCount: courses.length,
      articleCount: courses.reduce(
        (total, course) => total + course.articles.length,
        0
      ),
      courses,
    }
  })

const catalog = {
  source: `https://github.com/${OWNER}/${REPO}`,
  branch: BRANCH,
  commit,
  generatedAt: new Date().toISOString(),
  stats: {
    categories: normalizedCategories.length,
    courses: normalizedCategories.reduce(
      (total, category) => total + category.courseCount,
      0
    ),
    articles: normalizedCategories.reduce(
      (total, category) => total + category.articleCount,
      0
    ),
  },
  categories: normalizedCategories,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(catalog)}\n`)

console.log(
  `Synced ${catalog.stats.categories} categories, ${catalog.stats.courses} courses, ` +
    `${catalog.stats.articles} articles at ${commit.slice(0, 12)}.`
)
