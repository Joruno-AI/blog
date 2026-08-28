import type { Loader } from 'astro/loaders'

/**
 * CMS Media response types
 */
export interface CMSMedia {
  id: string
  url: string
  name: string
  type: string
  size: number
  createdAt: string
}

export interface CMSMediaResponse {
  photos: CMSMedia[]
  total: number
  limit: number
  offset: number
}

export interface MediaLoaderOptions {
  apiBaseUrl: string
  batchSize?: number
  /** Preserve the last successful local snapshot when the CMS is unavailable. */
  allowStaleOnError?: boolean
}

/**
 * Fetch JSON with retry logic.
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
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

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
        const waitTime = retryDelay * attempt
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Astro loader for fetching media from CMS API
 * Transforms CMS media data to match the blog's photoSchema
 */
export function mediaLoader(options: MediaLoaderOptions): Loader {
  // Use larger batch size - media items are smaller than posts
  const { apiBaseUrl, batchSize = 500, allowStaleOnError = false } = options
  const maxRetries = allowStaleOnError ? 1 : 3

  return {
    name: 'cms-media-loader',
    load: async ({ store, logger, parseData }) => {
      logger.info('Fetching media from CMS...')

      try {
        // Fetch all media in one request (usually small number)
        const mediaUrl = `${apiBaseUrl}/api/public/media?limit=${batchSize}&offset=0&type=image`

        let data: CMSMediaResponse
        try {
          data = await fetchJsonWithRetry<CMSMediaResponse>(
            mediaUrl,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'AstroBlog/1.0 (Build Process)',
              },
            },
            maxRetries
          )
        } catch (fetchError) {
          const errorMessage =
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError)
          throw new Error(
            `Failed to fetch media from ${mediaUrl}. Error: ${errorMessage}`
          )
        }

        const allMedia = [...data.photos]

        // Fetch every page before replacing the cached collection. This keeps
        // the previous complete snapshot if a later page fails.
        if (data.total > batchSize) {
          let offset = batchSize
          while (offset < data.total) {
            const nextUrl = `${apiBaseUrl}/api/public/media?limit=${batchSize}&offset=${offset}&type=image`
            const nextData = await fetchJsonWithRetry<CMSMediaResponse>(
              nextUrl,
              {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'AstroBlog/1.0 (Build Process)',
                },
              },
              maxRetries
            )
            allMedia.push(...nextData.photos)
            offset += batchSize
          }
        }

        store.clear()

        let totalFetched = 0

        // Process each media item
        for (const item of allMedia) {
          try {
            // Transform CMS media to photo schema format
            const entry = {
              id: item.url,
              data: {
                id: item.url,
                desc: item.name.replace(/\.[^/.]+$/, ''),
              },
            }

            // Parse and validate data against schema
            const parsedData = await parseData({
              id: entry.id,
              data: entry.data,
            })

            // Store the entry
            store.set({
              id: entry.id,
              data: parsedData,
            })

            totalFetched++
          } catch (err) {
            logger.error(`Error processing media ${item.id}: ${err}`)
          }
        }

        logger.info(`Successfully loaded ${totalFetched} media items from CMS`)
      } catch (err) {
        if (allowStaleOnError) {
          logger.warn(
            `CMS media unavailable; continuing with the last successful local snapshot. ${err}`
          )
          return
        }

        logger.error(`CMS media loader error: ${err}`)
        throw err
      }
    },
  }
}
