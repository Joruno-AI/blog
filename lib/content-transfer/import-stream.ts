import { createHash } from 'node:crypto'

import {
  CONTENT_BUNDLE_VERSION,
  CONTENT_SNAPSHOT_PATH,
  bundleFileSchema,
  contentBundleSchema,
  normalizeBundlePath,
  type BundleFile,
} from './contract'

const ASCII = {
  quote: 0x22,
  comma: 0x2c,
  minus: 0x2d,
  colon: 0x3a,
  leftBracket: 0x5b,
  backslash: 0x5c,
  rightBracket: 0x5d,
  leftBrace: 0x7b,
  rightBrace: 0x7d,
} as const

const MAX_NESTING_DEPTH = 64
const MAX_SMALL_STRING_BYTES = 16 * 1024
// Uploaded bundles may contain up to 20,000 files. Keeping 512 descriptors in
// one bounded page caps the scan phase at 40 R2 writes (+ the source GET),
// below the 50-operation Worker limit even for the schema maximum.
export const IMPORT_DESCRIPTOR_FILES_PER_PAGE = 512
// A descriptor page is serialized once for its immutable R2 object. This is a
// conservative ceiling for 512 schema-valid descriptors even when every
// bounded metadata string needs JSON escaping, and keeps the largest
// transient serialization well below the Worker's 128 MiB heap limit.
export const IMPORT_MAX_DESCRIPTOR_PAGE_BYTES = 24 * 1024 * 1024
// Production currently has 7,542 top-level items. 256 keeps its complete
// range index to 30 R2 writes (+ one read), below the 50-subrequest free limit.
export const IMPORT_SNAPSHOT_ITEMS_PER_PAGE = 256
export const IMPORT_MAX_SNAPSHOT_ITEMS = 10_000
export const IMPORT_MAX_SNAPSHOT_ITEM_BYTES = 8 * 1024 * 1024

export interface ImportContentRange {
  /** Byte offset in the persisted source object, excluding the JSON quotes. */
  offset: number
  /** Raw JSON-string byte length, excluding the JSON quotes. */
  length: number
}

export interface PersistedImportFile extends Omit<BundleFile, 'content'> {
  index: number
  contentRange?: ImportContentRange
  /** GitHub imports persist decoded text directly rather than inside an outer JSON string. */
  contentKey?: string
}

export interface ImportedBundleHeader {
  schemaVersion: typeof CONTENT_BUNDLE_VERSION
  generatedAt: string
  source: { repository: string | null; ref: string | null; commit: string | null }
}

export interface UploadedBundleScanResult {
  header: ImportedBundleHeader
  fileCount: number
  descriptorPageCount: number
  snapshot: PersistedImportFile | null
}

export const snapshotGroups = [
  'resources',
  'categories',
  'tags',
  'assets',
  'articles',
  'documents',
  'albums',
  'tracks',
  'collections',
  'categoryLinks',
  'tagLinks',
  'assetLinks',
  'collectionItems',
  'relations',
  'routes',
  'redirects',
  'publicationEvents',
  'settings',
] as const

export type SnapshotGroup = typeof snapshotGroups[number]

export interface SnapshotItemRange {
  group: SnapshotGroup
  offset: number
  length: number
}

export interface SnapshotIndexResult {
  itemCount: number
  pageCount: number
  groupCounts: Record<SnapshotGroup, number>
}

function isWhitespace(byte: number) {
  return byte === 0x20 || byte === 0x0a || byte === 0x0d || byte === 0x09
}

function isHex(byte: number) {
  return (byte >= 0x30 && byte <= 0x39)
    || (byte >= 0x41 && byte <= 0x46)
    || (byte >= 0x61 && byte <= 0x66)
}

function isNumberByte(byte: number) {
  return (byte >= 0x30 && byte <= 0x39)
    || byte === ASCII.minus || byte === 0x2b || byte === 0x2e || byte === 0x45 || byte === 0x65
}

/** Allocation-free incremental UTF-8 validation for large R2 byte streams. */
class Utf8Validator {
  private remaining = 0
  private codePoint = 0
  private minimum = 0

  push(bytes: Uint8Array) {
    for (const byte of bytes) {
      if (this.remaining) {
        if (byte < 0x80 || byte > 0xbf) throw new Error('Invalid content bundle: malformed UTF-8.')
        this.codePoint = (this.codePoint << 6) | (byte & 0x3f)
        this.remaining -= 1
        if (!this.remaining && (
          this.codePoint < this.minimum || this.codePoint > 0x10ffff
          || (this.codePoint >= 0xd800 && this.codePoint <= 0xdfff)
        )) throw new Error('Invalid content bundle: malformed UTF-8.')
        continue
      }
      if (byte <= 0x7f) continue
      if (byte >= 0xc2 && byte <= 0xdf) {
        this.remaining = 1
        this.codePoint = byte & 0x1f
        this.minimum = 0x80
      } else if (byte >= 0xe0 && byte <= 0xef) {
        this.remaining = 2
        this.codePoint = byte & 0x0f
        this.minimum = 0x800
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        this.remaining = 3
        this.codePoint = byte & 0x07
        this.minimum = 0x10000
      } else {
        throw new Error('Invalid content bundle: malformed UTF-8.')
      }
    }
  }

  finish() {
    if (this.remaining) throw new Error('Invalid content bundle: truncated UTF-8.')
  }
}

/**
 * Constant-memory byte reader used for persisted R2 JSON objects. It validates
 * UTF-8 incrementally and never concatenates the source body.
 */
class StreamingJsonReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private readonly utf8 = new Utf8Validator()
  private chunk: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
  private index = 0
  private ended = false
  private consumed = 0

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader()
  }

  get offset() {
    return this.consumed
  }

  private async fill() {
    while (this.index >= this.chunk.length && !this.ended) {
      const next = await this.reader.read()
      if (next.done) {
        this.ended = true
        this.utf8.finish()
        return
      }
      if (!next.value.byteLength) continue
      this.utf8.push(next.value)
      this.chunk = next.value
      this.index = 0
    }
  }

  async peek() {
    await this.fill()
    return this.ended ? null : this.chunk[this.index]
  }

  async read() {
    const byte = await this.peek()
    if (byte === null) return null
    this.index += 1
    this.consumed += 1
    return byte
  }

  async whitespace() {
    while (true) {
      const byte = await this.peek()
      if (byte === null || !isWhitespace(byte)) return
      await this.read()
    }
  }

  async expect(expected: number, message: string) {
    await this.whitespace()
    const byte = await this.read()
    if (byte !== expected) throw new Error(`Invalid content bundle: ${message} at byte ${this.offset}.`)
  }

  async string(options: { capture?: boolean; maxBytes?: number } = {}) {
    await this.whitespace()
    if (await this.read() !== ASCII.quote) {
      throw new Error(`Invalid content bundle: expected a JSON string at byte ${this.offset}.`)
    }
    const start = this.offset
    const captured: number[] = []
    let escaped = false
    let unicodeRemaining = 0
    while (true) {
      await this.fill()
      if (this.ended) throw new Error('Invalid content bundle: unterminated JSON string.')
      const chunkStart = this.index
      for (let cursor = chunkStart; cursor < this.chunk.length; cursor += 1) {
        const byte = this.chunk[cursor]
        if (!escaped && unicodeRemaining === 0 && byte === ASCII.quote) {
          const consumed = cursor - chunkStart + 1
          this.index = cursor + 1
          this.consumed += consumed
          const end = this.offset - 1
          let value: string | undefined
          if (options.capture) {
            const raw = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(captured))
            value = JSON.parse(`"${raw}"`) as string
          }
          return { value, range: { offset: start, length: end - start } }
        }
        if (options.capture) {
          captured.push(byte)
          if (captured.length > (options.maxBytes ?? MAX_SMALL_STRING_BYTES)) {
            throw new Error('Invalid content bundle: metadata string exceeds the Worker-safe limit.')
          }
        }
        if (unicodeRemaining > 0) {
          if (!isHex(byte)) throw new Error('Invalid content bundle: malformed Unicode escape.')
          unicodeRemaining -= 1
          continue
        }
        if (escaped) {
          if (byte === 0x75) unicodeRemaining = 4
          else if (![ASCII.quote, ASCII.backslash, 0x2f, 0x62, 0x66, 0x6e, 0x72, 0x74].includes(byte)) {
            throw new Error('Invalid content bundle: malformed JSON escape.')
          }
          escaped = false
          continue
        }
        if (byte < 0x20) throw new Error('Invalid content bundle: unescaped control character in JSON string.')
        if (byte === ASCII.backslash) escaped = true
      }
      const consumed = this.chunk.length - chunkStart
      this.index = this.chunk.length
      this.consumed += consumed
    }
  }

  async literal(expected: string) {
    for (const character of expected) {
      if (await this.read() !== character.charCodeAt(0)) {
        throw new Error(`Invalid content bundle: malformed ${expected} literal.`)
      }
    }
  }

  async primitive(): Promise<string | number | boolean | null> {
    await this.whitespace()
    const byte = await this.peek()
    if (byte === ASCII.quote) return (await this.string({ capture: true })).value!
    if (byte === 0x74) { await this.literal('true'); return true }
    if (byte === 0x66) { await this.literal('false'); return false }
    if (byte === 0x6e) { await this.literal('null'); return null }
    if (byte === null || !isNumberByte(byte)) throw new Error(`Invalid content bundle: expected a scalar at byte ${this.offset}.`)
    const bytes: number[] = []
    while (true) {
      const next = await this.peek()
      if (next === null || !isNumberByte(next)) break
      bytes.push((await this.read())!)
      if (bytes.length > 128) throw new Error('Invalid content bundle: number exceeds the Worker-safe limit.')
    }
    const text = new TextDecoder().decode(Uint8Array.from(bytes))
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'number') throw new Error('Invalid content bundle: malformed number.')
    return parsed
  }

  async skipValue(depth = 0): Promise<void> {
    if (depth > MAX_NESTING_DEPTH) throw new Error('Invalid content bundle: JSON nesting exceeds the Worker-safe limit.')
    await this.whitespace()
    const byte = await this.peek()
    if (byte === ASCII.quote) { await this.string(); return }
    if (byte === ASCII.leftBrace) {
      await this.read()
      await this.whitespace()
      if (await this.peek() === ASCII.rightBrace) { await this.read(); return }
      while (true) {
        await this.string()
        await this.expect(ASCII.colon, 'expected a colon')
        await this.skipValue(depth + 1)
        await this.whitespace()
        const delimiter = await this.read()
        if (delimiter === ASCII.rightBrace) return
        if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected an object delimiter.')
      }
    }
    if (byte === ASCII.leftBracket) {
      await this.read()
      await this.whitespace()
      if (await this.peek() === ASCII.rightBracket) { await this.read(); return }
      while (true) {
        await this.skipValue(depth + 1)
        await this.whitespace()
        const delimiter = await this.read()
        if (delimiter === ASCII.rightBracket) return
        if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected an array delimiter.')
      }
    }
    await this.primitive()
  }

  /**
   * Finds one persisted snapshot item boundary with no per-token promises.
   * The item itself is parsed and schema-validated when its bounded R2 range is
   * staged; this pass only validates UTF-8, string escapes, and bracket balance.
   */
  async scanSnapshotValue() {
    await this.whitespace()
    const first = await this.peek()
    if (first === ASCII.quote) { await this.string(); return }
    if (first !== ASCII.leftBrace && first !== ASCII.leftBracket) {
      await this.primitive()
      return
    }
    await this.read()
    const closers = [first === ASCII.leftBrace ? ASCII.rightBrace : ASCII.rightBracket]
    let inString = false
    let escaped = false
    let unicodeRemaining = 0
    while (closers.length) {
      await this.fill()
      if (this.ended) throw new Error('Invalid content snapshot: unterminated item.')
      const chunkStart = this.index
      for (let cursor = chunkStart; cursor < this.chunk.length; cursor += 1) {
        const byte = this.chunk[cursor]
        if (inString) {
          if (unicodeRemaining) {
            if (!isHex(byte)) throw new Error('Invalid content snapshot: malformed Unicode escape.')
            unicodeRemaining -= 1
          } else if (escaped) {
            if (byte === 0x75) unicodeRemaining = 4
            else if (![ASCII.quote, ASCII.backslash, 0x2f, 0x62, 0x66, 0x6e, 0x72, 0x74].includes(byte)) {
              throw new Error('Invalid content snapshot: malformed JSON escape.')
            }
            escaped = false
          } else if (byte === ASCII.backslash) escaped = true
          else if (byte === ASCII.quote) inString = false
          else if (byte < 0x20) throw new Error('Invalid content snapshot: unescaped control character.')
        } else if (byte === ASCII.quote) {
          inString = true
        } else if (byte === ASCII.leftBrace || byte === ASCII.leftBracket) {
          closers.push(byte === ASCII.leftBrace ? ASCII.rightBrace : ASCII.rightBracket)
          if (closers.length > MAX_NESTING_DEPTH) {
            throw new Error('Invalid content snapshot: JSON nesting exceeds the Worker-safe limit.')
          }
        } else if (byte === ASCII.rightBrace || byte === ASCII.rightBracket) {
          if (closers.pop() !== byte) throw new Error('Invalid content snapshot: mismatched item delimiter.')
          if (!closers.length) {
            const consumed = cursor - chunkStart + 1
            this.index = cursor + 1
            this.consumed += consumed
            return
          }
        }
      }
      const consumed = this.chunk.length - chunkStart
      this.index = this.chunk.length
      this.consumed += consumed
    }
  }

  async finish() {
    await this.whitespace()
    if (await this.peek() !== null) throw new Error(`Invalid content bundle: trailing data at byte ${this.offset}.`)
  }
}

function fieldString(value: unknown, field: string) {
  if (typeof value !== 'string') throw new Error(`Invalid content bundle: ${field} must be a string.`)
  return value
}

function nullableString(value: unknown, field: string) {
  if (value !== null && typeof value !== 'string') throw new Error(`Invalid content bundle: ${field} must be a string or null.`)
  return value
}

async function parseSource(reader: StreamingJsonReader) {
  await reader.expect(ASCII.leftBrace, 'source must be an object')
  const source: Record<string, unknown> = {}
  const seen = new Set<string>()
  await reader.whitespace()
  if (await reader.peek() === ASCII.rightBrace) await reader.read()
  else {
    while (true) {
      const key = (await reader.string({ capture: true })).value!
      if (seen.has(key)) throw new Error(`Invalid content bundle: duplicate source field ${key}.`)
      seen.add(key)
      await reader.expect(ASCII.colon, 'expected a source-field colon')
      if (key === 'repository' || key === 'ref' || key === 'commit') source[key] = await reader.primitive()
      else await reader.skipValue()
      await reader.whitespace()
      const delimiter = await reader.read()
      if (delimiter === ASCII.rightBrace) break
      if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected a source-object delimiter.')
    }
  }
  return {
    repository: nullableString(source.repository, 'source.repository'),
    ref: nullableString(source.ref, 'source.ref'),
    commit: nullableString(source.commit, 'source.commit'),
  }
}

async function parseBundleFile(reader: StreamingJsonReader, index: number): Promise<PersistedImportFile> {
  await reader.expect(ASCII.leftBrace, 'bundle file must be an object')
  const fields: Record<string, unknown> = {}
  const seen = new Set<string>()
  let contentRange: ImportContentRange | undefined
  let hasContent = false
  await reader.whitespace()
  if (await reader.peek() === ASCII.rightBrace) await reader.read()
  else {
    while (true) {
      const key = (await reader.string({ capture: true })).value!
      if (seen.has(key)) throw new Error(`Invalid content bundle: duplicate file field ${key}.`)
      seen.add(key)
      await reader.expect(ASCII.colon, 'expected a file-field colon')
      if (key === 'content') {
        hasContent = true
        contentRange = (await reader.string()).range
      } else if (['path', 'kind', 'encoding', 'mediaType', 'url', 'sourceKey', 'checksum', 'size'].includes(key)) {
        fields[key] = await reader.primitive()
      } else {
        await reader.skipValue()
      }
      await reader.whitespace()
      const delimiter = await reader.read()
      if (delimiter === ASCII.rightBrace) break
      if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected a file-object delimiter.')
    }
  }
  const candidate = bundleFileSchema.parse({
    ...fields,
    ...(hasContent ? { content: '' } : {}),
  })
  const descriptor = { ...candidate }
  delete descriptor.content
  return {
    ...descriptor,
    index,
    ...(contentRange ? { contentRange } : {}),
  }
}

/**
 * Scans an uploaded export without materializing the outer bundle or embedded
 * file contents. Descriptors are flushed in bounded pages by the caller.
 */
export async function scanUploadedContentBundle(
  stream: ReadableStream<Uint8Array>,
  onDescriptorPage: (page: number, files: PersistedImportFile[]) => Promise<void>,
): Promise<UploadedBundleScanResult> {
  const reader = new StreamingJsonReader(stream)
  const encoder = new TextEncoder()
  await reader.expect(ASCII.leftBrace, 'bundle must be an object')
  const header: Partial<ImportedBundleHeader> = {}
  const topLevel = new Set<string>()
  // Retain fixed-size digests rather than up to 20,000 attacker-controlled
  // 1,500-byte paths for the lifetime of the streaming scan.
  const pathDigests = new Set<string>()
  let fileCount = 0
  let descriptorPageCount = 0
  let page: PersistedImportFile[] = []
  // Include the opening and closing array brackets. Individual descriptor
  // strings are measured before retention so the limit does not require a
  // second page-sized JSON allocation beside the R2 PUT serialization.
  let pageBytes = 2
  let snapshot: PersistedImportFile | null = null
  let sawFiles = false

  const flush = async () => {
    if (!page.length) return
    await onDescriptorPage(descriptorPageCount, page)
    descriptorPageCount += 1
    page = []
    pageBytes = 2
  }

  await reader.whitespace()
  if (await reader.peek() === ASCII.rightBrace) await reader.read()
  else {
    while (true) {
      const key = (await reader.string({ capture: true })).value!
      if (topLevel.has(key)) throw new Error(`Invalid content bundle: duplicate top-level field ${key}.`)
      topLevel.add(key)
      await reader.expect(ASCII.colon, 'expected a top-level colon')
      if (key === 'schemaVersion') header.schemaVersion = fieldString(await reader.primitive(), key) as typeof CONTENT_BUNDLE_VERSION
      else if (key === 'generatedAt') header.generatedAt = fieldString(await reader.primitive(), key)
      else if (key === 'source') header.source = await parseSource(reader)
      else if (key === 'files') {
        sawFiles = true
        await reader.expect(ASCII.leftBracket, 'files must be an array')
        await reader.whitespace()
        if (await reader.peek() === ASCII.rightBracket) await reader.read()
        else {
          while (true) {
            if (fileCount >= 20_000) throw new Error('Invalid content bundle: too many files.')
            const file = await parseBundleFile(reader, fileCount)
            const normalized = normalizeBundlePath(file.path)
            const pathDigest = createHash('sha256').update(normalized).digest('base64url')
            if (pathDigests.has(pathDigest)) throw new Error(`Invalid content bundle: duplicate file path ${normalized}.`)
            pathDigests.add(pathDigest)
            if (normalized === CONTENT_SNAPSHOT_PATH) snapshot = file
            const serializedDescriptor = JSON.stringify(file)
            const descriptorBytes = encoder.encode(serializedDescriptor).byteLength
              + (page.length ? 1 : 0)
            if (pageBytes + descriptorBytes > IMPORT_MAX_DESCRIPTOR_PAGE_BYTES) {
              throw new Error('Invalid content bundle: descriptor page exceeds the Worker-safe limit.')
            }
            page.push(file)
            pageBytes += descriptorBytes
            fileCount += 1
            if (page.length >= IMPORT_DESCRIPTOR_FILES_PER_PAGE) await flush()
            await reader.whitespace()
            const delimiter = await reader.read()
            if (delimiter === ASCII.rightBracket) break
            if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected a files-array delimiter.')
          }
        }
      } else {
        await reader.skipValue()
      }
      await reader.whitespace()
      const delimiter = await reader.read()
      if (delimiter === ASCII.rightBrace) break
      if (delimiter !== ASCII.comma) throw new Error('Invalid content bundle: expected a bundle-object delimiter.')
    }
  }
  await flush()
  await reader.finish()
  if (!sawFiles) throw new Error('Invalid content bundle: files is required.')
  const validated = contentBundleSchema.parse({ ...header, files: [] })
  if (snapshot && (snapshot.encoding === 'external' || !snapshot.contentRange)) {
    throw new Error('Content snapshot must be embedded.')
  }
  return {
    header: {
      schemaVersion: validated.schemaVersion,
      generatedAt: validated.generatedAt,
      source: validated.source,
    },
    fileCount,
    descriptorPageCount,
    snapshot,
  }
}

/** Indexes top-level snapshot array elements by byte range without parsing the full snapshot. */
export async function indexContentSnapshot(
  stream: ReadableStream<Uint8Array>,
  onIndexPage: (page: number, items: SnapshotItemRange[]) => Promise<void>,
): Promise<SnapshotIndexResult> {
  const reader = new StreamingJsonReader(stream)
  await reader.expect(ASCII.leftBrace, 'content snapshot must be an object')
  const required = new Set<SnapshotGroup>(snapshotGroups)
  const seen = new Set<string>()
  const groupCounts = Object.fromEntries(snapshotGroups.map((group) => [group, 0])) as Record<SnapshotGroup, number>
  let page: SnapshotItemRange[] = []
  let pageCount = 0
  let itemCount = 0
  const flush = async () => {
    if (!page.length) return
    await onIndexPage(pageCount, page)
    pageCount += 1
    page = []
  }

  await reader.whitespace()
  if (await reader.peek() === ASCII.rightBrace) await reader.read()
  else {
    while (true) {
      const key = (await reader.string({ capture: true })).value!
      if (seen.has(key)) throw new Error(`Invalid content snapshot: duplicate field ${key}.`)
      seen.add(key)
      await reader.expect(ASCII.colon, 'expected a snapshot-field colon')
      if (required.has(key as SnapshotGroup)) {
        const group = key as SnapshotGroup
        await reader.expect(ASCII.leftBracket, `${group} must be an array`)
        await reader.whitespace()
        if (await reader.peek() === ASCII.rightBracket) await reader.read()
        else {
          while (true) {
            await reader.whitespace()
            const offset = reader.offset
            await reader.scanSnapshotValue()
            const length = reader.offset - offset
            if (length > IMPORT_MAX_SNAPSHOT_ITEM_BYTES) {
              throw new Error(`Invalid content snapshot: one ${group} item exceeds the 8 MB Worker-safe limit.`)
            }
            page.push({ group, offset, length })
            groupCounts[group] += 1
            itemCount += 1
            if (itemCount > IMPORT_MAX_SNAPSHOT_ITEMS) {
              throw new Error('Invalid content snapshot: more than 10,000 items exceed the Worker-safe index limit.')
            }
            if (page.length >= IMPORT_SNAPSHOT_ITEMS_PER_PAGE) await flush()
            await reader.whitespace()
            const delimiter = await reader.read()
            if (delimiter === ASCII.rightBracket) break
            if (delimiter !== ASCII.comma) throw new Error(`Invalid content snapshot: expected a ${group} delimiter.`)
          }
        }
      } else {
        await reader.skipValue()
      }
      await reader.whitespace()
      const delimiter = await reader.read()
      if (delimiter === ASCII.rightBrace) break
      if (delimiter !== ASCII.comma) throw new Error('Invalid content snapshot: expected an object delimiter.')
    }
  }
  await flush()
  await reader.finish()
  const missing = snapshotGroups.filter((group) => !seen.has(group))
  if (missing.length) throw new Error(`Invalid content snapshot: missing ${missing.join(', ')}.`)
  return { itemCount, pageCount, groupCounts }
}

/**
 * Decodes the bytes inside one JSON string as a stream. This avoids creating a
 * second 15+ MB JavaScript string for `.joruno/content.json`.
 */
export function decodeJsonStringStream(input: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const encoder = new TextEncoder()
  let escaped = false
  let unicode = ''
  let pendingHighSurrogate: number | null = null

  const emit = (controller: TransformStreamDefaultController<Uint8Array>, text: string) => {
    if (!text) return
    const bytes = encoder.encode(text)
    controller.enqueue(bytes)
  }

  const stream = input.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      let plain = ''
      const flushPlain = () => {
        emit(controller, plain)
        plain = ''
      }
      for (const character of text) {
        if (unicode) {
          if (!/[0-9a-f]/i.test(character)) throw new Error('Invalid content bundle: malformed Unicode escape.')
          unicode += character
          if (unicode.length === 5) {
            const code = Number.parseInt(unicode.slice(1), 16)
            unicode = ''
            if (code >= 0xd800 && code <= 0xdbff) {
              if (pendingHighSurrogate !== null) throw new Error('Invalid content bundle: malformed surrogate pair.')
              pendingHighSurrogate = code
            } else if (code >= 0xdc00 && code <= 0xdfff) {
              if (pendingHighSurrogate === null) throw new Error('Invalid content bundle: malformed surrogate pair.')
              plain += String.fromCodePoint(0x10000 + ((pendingHighSurrogate - 0xd800) << 10) + (code - 0xdc00))
              pendingHighSurrogate = null
            } else {
              if (pendingHighSurrogate !== null) throw new Error('Invalid content bundle: malformed surrogate pair.')
              plain += String.fromCharCode(code)
            }
          }
          continue
        }
        if (escaped) {
          escaped = false
          if (character === 'u') { flushPlain(); unicode = 'u'; continue }
          const mapped: Record<string, string> = {
            '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t',
          }
          if (!(character in mapped)) throw new Error('Invalid content bundle: malformed JSON escape.')
          if (pendingHighSurrogate !== null) throw new Error('Invalid content bundle: malformed surrogate pair.')
          plain += mapped[character]
          continue
        }
        if (character === '\\') { escaped = true; continue }
        if (pendingHighSurrogate !== null) throw new Error('Invalid content bundle: malformed surrogate pair.')
        if (character.charCodeAt(0) < 0x20) throw new Error('Invalid content bundle: unescaped control character.')
        plain += character
      }
      flushPlain()
    },
    flush(controller) {
      const tail = decoder.decode()
      if (tail) emit(controller, tail)
      if (escaped || unicode || pendingHighSurrogate !== null) {
        throw new Error('Invalid content bundle: truncated JSON string escape.')
      }
    },
  }))

  return { stream }
}

/** Incremental RFC 4648 decoder for legacy base64-encoded bundle files. */
export function decodeBase64Stream(input: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder('ascii', { fatal: true })
  let pending = ''
  let sawPadding = false
  return input.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = (pending + decoder.decode(chunk, { stream: true })).replaceAll(/\s/g, '')
      if (sawPadding && text) throw new Error('Invalid content bundle: data follows base64 padding.')
      const completeLength = text.length - (text.length % 4)
      pending = text.slice(completeLength)
      if (!completeLength) return
      const block = text.slice(0, completeLength)
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(block)) throw new Error('Invalid content bundle: malformed base64 content.')
      sawPadding = block.includes('=')
      const binary = atob(block)
      controller.enqueue(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
    },
    flush(controller) {
      const tail = (pending + decoder.decode()).replaceAll(/\s/g, '')
      if (!tail) return
      if (sawPadding) throw new Error('Invalid content bundle: data follows base64 padding.')
      if (tail.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(tail)) {
        throw new Error('Invalid content bundle: malformed base64 content.')
      }
      const binary = atob(tail)
      controller.enqueue(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
    },
  }))
}
