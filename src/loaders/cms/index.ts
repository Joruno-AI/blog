import type { Loader } from 'astro/loaders'
import type {
  CMSLoaderOptions,
  CMSPost,
  CMSPostsWithContentResponse,
} from './types'

/**
 * Fetch JSON with retry logic and timeout.
 * A request only succeeds after the response body is fully read.
 */
async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${url}`)
        }

        const data = (await response.json()) as T

        return data
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        const waitTime = retryDelay * attempt
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Astro loader for fetching blog posts from CMS API
 * Uses parallel fetching for better performance
 */
export function cmsLoader(options: CMSLoaderOptions): Loader {
  // Larger batch size for faster loading (200 posts per request)
  const { apiBaseUrl, batchSize = 200 } = options
  // Number of parallel requests
  const parallelRequests = 4

  return {
    name: 'cms-loader',
    load: async ({ store, logger, parseData, renderMarkdown }) => {
      logger.info('Fetching posts from CMS...')

      try {
        // Clear existing entries
        store.clear()

        // First, get total count
        const countUrl = `${apiBaseUrl}/api/public/posts?limit=1&offset=0`
        const countData = await fetchJsonWithRetry<{ total: number }>(countUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AstroBlog/1.0 (Build Process)',
          },
        })

        const total = countData.total

        logger.info(
          `Total posts: ${total}, fetching with batch size ${batchSize}`
        )

        // Calculate batches needed
        const totalBatches = Math.ceil(total / batchSize)
        const allPosts: CMSPost[] = []

        // Fetch batches in parallel groups
        for (
          let groupStart = 0;
          groupStart < totalBatches;
          groupStart += parallelRequests
        ) {
          const groupEnd = Math.min(groupStart + parallelRequests, totalBatches)
          const batchPromises: Promise<CMSPost[]>[] = []

          for (
            let batchIndex = groupStart;
            batchIndex < groupEnd;
            batchIndex++
          ) {
            const offset = batchIndex * batchSize
            const postsUrl = `${apiBaseUrl}/api/public/posts?limit=${batchSize}&offset=${offset}&includeContent=true`

            logger.info(
              `Fetching batch ${batchIndex + 1}/${totalBatches}: offset=${offset}`
            )

            const promise = fetchJsonWithRetry<CMSPostsWithContentResponse>(
              postsUrl,
              {
                headers: {
                  'Accept': 'application/json',
                  'Connection': 'keep-alive',
                  'User-Agent': 'AstroBlog/1.0 (Build Process)',
                },
              }
            ).then((data) => data.posts)

            batchPromises.push(promise)
          }

          // Wait for all batches in this group to complete
          const batchResults = await Promise.all(batchPromises)
          for (const posts of batchResults) {
            allPosts.push(...posts)
          }
        }

        logger.info(`Fetched ${allPosts.length} posts, processing...`)

        // Process all posts
        let totalFetched = 0
        for (const post of allPosts) {
          try {
            // Transform CMS data to blog schema format
            const entry = transformPostToEntry(post)

            // Parse and validate data against schema
            const parsedData = await parseData({
              id: entry.id,
              data: entry.data,
            })

            // Render markdown content to HTML
            const rendered = await renderMarkdown(entry.body)

            // Store the entry with rendered content
            store.set({
              id: entry.id,
              data: parsedData,
              body: entry.body,
              rendered,
            })

            totalFetched++
          } catch (err) {
            logger.error(`Error processing post ${post.slug}: ${err}`)
          }
        }

        logger.info(`Successfully loaded ${totalFetched} posts from CMS`)
      } catch (err) {
        logger.error(`CMS loader error: ${err}`)
        throw err
      }
    },
  }
}

/**
 * Transform CMS post data to blog entry format
 * ID format: categoryPath/postSlug (e.g., "frontend/react/hooks-intro")
 * This allows URLs like /blog/frontend/react/hooks-intro
 */
function transformPostToEntry(post: CMSPost) {
  // Extract tags as string array
  const tags = post.postTags?.map((pt) => pt.tag.name) || []

  // Get category path for URL structure (uses slug path)
  const categoryPath = post.categoryPath || ''

  // Extract actual post slug - remove category path prefix if present
  // CMS may store slug as "category/post-slug" but we only need "post-slug"
  const actualSlug = post.slug.includes('/')
    ? post.slug.split('/').pop() || post.slug
    : post.slug

  // Build entry ID: categoryPath/postSlug
  // This determines the URL: /blog/{id}
  const id = categoryPath ? `${categoryPath}/${actualSlug}` : actualSlug

  // Use categoryNamePath for the category field
  // This is the full path of category NAMES (not slugs) like "Frontend/React"
  // This is important for buildNestedCategoryTree to correctly get category names
  const category = post.categoryNamePath || post.category?.name || ''

  // Build frontmatter data matching postSchema
  const data: Record<string, unknown> = {
    title: post.title,
    subtitle: post.subtitle || '',
    description: post.excerpt || '',
    pubDate: new Date(post.pubDate),
    lastModDate: post.lastModDate ? new Date(post.lastModDate) : undefined,
    minutesRead: post.minutesRead || undefined,
    radio: post.radio,
    video: post.video,
    platform: post.platform || '',
    ogImage: post.ogImage || true,
    toc: post.toc,
    share: post.share,
    giscus: post.giscus,
    search: post.search,
    draft: post.draft,
    category,
    tags,
  }

  // Remove undefined values
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) {
      delete data[key]
    }
  })

  return {
    id,
    data,
    body: post.content,
  }
}

export type {
  CMSLoaderOptions,
  CMSPost,
  CMSPostsResponse,
  CMSPostsWithContentResponse,
} from './types'
