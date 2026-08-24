import { geektimeCatalog } from '~/utils/geektime'
import podcastData from '~/content/podcasts/data.json'

interface PodcastAudio {
  url: string
  narrator?: string
  duration?: number
  size?: number
}

const podcasts = podcastData as Record<string, PodcastAudio>

const catalog = {
  ...geektimeCatalog,
  categories: geektimeCatalog.categories.map((category) => ({
    ...category,
    courses: category.courses.map((course) => ({
      ...course,
      articles: course.articles.map((article) => ({
        ...article,
        podcast: podcasts[`${course.sourceId}:${article.path}`],
      })),
    })),
  })),
}

export function GET() {
  return new Response(JSON.stringify(catalog), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
