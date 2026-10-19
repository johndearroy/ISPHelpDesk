import { createHash } from 'node:crypto'

type Entry<T> = { value: T; expiresAt: number }

export function createCache<T>(maxEntries = 500, ttlMs = 60 * 60 * 1000) {
  const entries = new Map<string, Entry<T>>()

  return {
    get(key: string) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt < Date.now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key: string, value: T) {
      entries.delete(key)
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
      // a Map keeps insertion order, so the first key is the oldest
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest !== undefined) entries.delete(oldest)
      }
    },

    clear() {
      entries.clear()
    },
  }
}

export function hashKey(...parts: unknown[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}
