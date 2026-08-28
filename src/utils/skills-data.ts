import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { FullIndexItem } from '~/utils/skills'

let cache: FullIndexItem[] | null = null

/** 构建期读取全量索引 (public/agent/full-index.json, 由 sync:skills 生成) */
export function loadFullIndex(): FullIndexItem[] {
  if (cache) return cache
  const raw = readFileSync(
    resolve(process.cwd(), 'public/agent/full-index.json'),
    'utf8'
  )
  cache = JSON.parse(raw).items as FullIndexItem[]
  return cache
}
