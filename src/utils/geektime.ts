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
    courses: (Omit<GeektimeCourse, 'sourceId'> & { sourceId?: string })[]
  })[]
}

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
  const categories = catalog.categories.map((category) => ({
    ...category,
    courses: category.courses.map((course) => ({
      ...course,
      sourceId: course.sourceId || id,
    })),
  }))

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
    ? getGeektimeArticleUrl(firstArticle.path, course.sourceId)
    : '/docs/'
}

export function getGeektimeArticleUrl(
  articlePath: string,
  sourceId = 'geektime'
) {
  const params = new URLSearchParams({ source: sourceId, path: articlePath })
  return `/docs/read/?${params.toString()}`
}

export function formatGeektimeArticleTitle(title: string) {
  return title.replace(/^\d+\s*[-–—]\s*/, '')
}
