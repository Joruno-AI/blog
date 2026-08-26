import geektimeData from '~/data/geektime-catalog.json'
import nuggetsData from '~/data/nuggets-catalog.json'

export interface DocsSource {
  id: string
  name: string
  source: string
  repository: string
  branch: string
  commit: string
  generatedAt: string
}

export interface GeektimeArticle {
  title: string
  displayTitle: string
  sequence: string
  path: string
  bytes: number
}

export interface GeektimeCourse {
  id: string
  sourceId: string
  name: string
  path: string
  articles: GeektimeArticle[]
}

export interface GeektimeCategory {
  id: string
  name: string
  courseCount: number
  articleCount: number
  courses: GeektimeCourse[]
}

export interface GeektimeCatalog {
  sources: DocsSource[]
  generatedAt: string
  stats: {
    categories: number
    courses: number
    articles: number
  }
  categories: GeektimeCategory[]
}

interface SourceCatalog {
  sourceId?: string
  sourceName?: string
  source: string
  repository?: string
  branch: string
  commit: string
  generatedAt: string
  categories: (Omit<GeektimeCategory, 'courses'> & {
    courses: (Omit<GeektimeCourse, 'sourceId' | 'articles'> & {
      sourceId?: string
      articles: Omit<GeektimeArticle, 'displayTitle' | 'sequence'>[]
    })[]
  })[]
}

const ARTICLE_SEQUENCE_PATTERNS = [
  /^\s*第\s*(\d{1,3})\s*[讲章节课期篇]\s*(?:[-–—._、:：丨｜]\s*)?/u,
  /^\s*[【[(（]\s*(\d{1,3})\s*[】\])）]\s*(?:[-–—._、:：丨｜]\s*)?/u,
  /^\s*(\d{1,3})\s*(?:[-–—._、:：丨｜]\s*|\s+)(?=\S)/u,
  /^\s*(\d{1,2})(?=\[|[\u3400-\u9fff])/u,
]

function normalizeSource(
  catalog: SourceCatalog,
  fallback: Pick<DocsSource, 'id' | 'name' | 'repository'>
) {
  const id = catalog.sourceId || fallback.id
  const source: DocsSource = {
    id,
    name: catalog.sourceName || fallback.name,
    source: catalog.source,
    repository: catalog.repository || fallback.repository,
    branch: catalog.branch,
    commit: catalog.commit,
    generatedAt: catalog.generatedAt,
  }
  const categories = catalog.categories
    .map((category) => {
      const courses = category.courses
        .map((course) => {
          const articles = course.articles
            .filter((article) => article.bytes > 0)
            .map((article, index) => ({
              ...article,
              ...getGeektimeArticlePresentation(article.title, index),
            }))

          return {
            ...course,
            sourceId: course.sourceId || id,
            articles,
          }
        })
        .filter((course) => course.articles.length > 0)

      return {
        ...category,
        courseCount: courses.length,
        articleCount: courses.reduce(
          (total, course) => total + course.articles.length,
          0
        ),
        courses,
      }
    })
    .filter((category) => category.courses.length > 0)

  return { source, categories }
}

const geektime = normalizeSource(geektimeData as SourceCatalog, {
  id: 'geektime',
  name: '极客时间',
  repository: 'uaxe/geektime-docs',
})
const nuggets = normalizeSource(nuggetsData as SourceCatalog, {
  id: 'nuggets',
  name: '掘金小册',
  repository: 'lm-rebooter/NuggetsBooklet',
})
const sources = [geektime.source, nuggets.source]
const categories = [...geektime.categories, ...nuggets.categories]

export const geektimeCatalog: GeektimeCatalog = {
  sources,
  generatedAt: sources
    .map((source) => source.generatedAt)
    .sort()
    .at(-1)!,
  stats: {
    categories: categories.length,
    courses: categories.reduce(
      (total, category) => total + category.courseCount,
      0
    ),
    articles: categories.reduce(
      (total, category) => total + category.articleCount,
      0
    ),
  },
  categories,
}

export function getGeektimeCourses() {
  return geektimeCatalog.categories.flatMap((category) =>
    category.courses.map((course) => ({ category, course }))
  )
}

export function getGeektimeCourseUrl(courseId: string) {
  const course = getGeektimeCourses().find(
    ({ course: item }) => item.id === courseId
  )?.course
  const firstArticle = course?.articles[0]
  return firstArticle && course
    ? getGeektimeArticleUrl(firstArticle.path, course.sourceId, course.id)
    : '/docs/'
}

export function getGeektimeArticleUrl(
  articlePath: string,
  sourceId = 'geektime',
  courseId?: string
) {
  const params = new URLSearchParams({ source: sourceId, path: articlePath })
  if (courseId) params.set('course', courseId)
  return `/docs/read/?${params.toString()}`
}

export function formatGeektimeArticleTitle(title: string) {
  return parseGeektimeArticleTitle(title).displayTitle
}

export function parseGeektimeArticleTitle(title: string) {
  for (const pattern of ARTICLE_SEQUENCE_PATTERNS) {
    const match = title.match(pattern)
    if (!match) continue

    return {
      displayTitle: title.slice(match[0].length).trim() || title.trim(),
    }
  }

  return { displayTitle: title.trim() }
}

export function getGeektimeArticlePresentation(title: string, index: number) {
  const { displayTitle } = parseGeektimeArticleTitle(title)
  const sequence = String(index + 1).padStart(2, '0')

  return { displayTitle, sequence }
}
