import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'

export async function getSetting(key: string) {
  const result = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  })
  return result?.value || null
}

export async function getSettings(keys: string[]) {
  const results = await db.query.settings.findMany({
    where: (settings, { inArray }) => inArray(settings.key, keys),
  })
  return results.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string | null>)
}

export async function setSetting(key: string, value: string | null) {
  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  })

  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
  } else {
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      key,
      value,
    })
  }
}

export async function deleteSetting(key: string) {
  await db.delete(settings).where(eq(settings.key, key))
}
