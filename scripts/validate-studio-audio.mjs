import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CMS_API_URL = process.env.CMS_API_URL
const CONCURRENCY = Math.max(
  1,
  Number(process.env.MUSIC_FINGERPRINT_CONCURRENCY) || 6
)
const outputDir = path.resolve(process.env.MUSIC_AUDIT_OUTPUT || 'reports')
const cacheDir = path.join(outputDir, 'music-fingerprints')

if (!CMS_API_URL) throw new Error('CMS_API_URL is not configured')

function parseClock(value) {
  const [minutes, seconds] = String(value || '0:0').split(':').map(Number)
  return (minutes || 0) * 60 + (seconds || 0)
}

function parseLyricsWindow(lyrics) {
  const stamps = [
    ...String(lyrics || '').matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g),
  ].map((match) => Number(match[1]) * 60 + Number(match[2]))
  return stamps.length
    ? { first: Math.min(...stamps), last: Math.max(...stamps) }
    : null
}

function collectionId(album) {
  return album.id.match(/(\d{7,})$/)?.[1] ??
    (album.id === 'david-tao' ? '1416149926' : null)
}

async function fetchAppleAlbum(album) {
  const id = collectionId(album)
  if (!id) return { id: null, tracks: [], error: 'missing Apple collection id' }
  const url = `https://itunes.apple.com/lookup?${new URLSearchParams({
    id,
    entity: 'song',
    country: 'tw',
    limit: '200',
  })}`
  const response = await fetch(url)
  if (!response.ok) return { id, tracks: [], error: `Apple ${response.status}` }
  const data = await response.json()
  const tracks = data.results
    .filter((item) => item.wrapperType === 'track')
    .sort(
      (a, b) =>
        (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
        (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
    )
  return { id, tracks, error: null }
}

function runFpcalc(url) {
  return new Promise((resolve) => {
    const child = spawn('fpcalc', ['-raw', '-json', url], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: stderr.trim() })
      try {
        const result = JSON.parse(stdout)
        resolve({
          ok: true,
          duration: Number(result.duration) || 0,
          fingerprint: result.fingerprint || [],
        })
      } catch (error) {
        resolve({ ok: false, error: String(error) })
      }
    })
  })
}

async function fingerprint(url, cacheKey) {
  const cachePath = path.join(cacheDir, `${cacheKey}.json`)
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    const result = await runFpcalc(url)
    await writeFile(cachePath, `${JSON.stringify(result)}\n`)
    return result
  }
}

function popcount(value) {
  let x = value >>> 0
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

function compareFingerprints(full, sample) {
  if (!full?.length || !sample?.length) return null
  let best = null
  for (let offset = -12; offset <= full.length - sample.length + 12; offset++) {
    let matchingBits = 0
    let totalBits = 0
    for (let index = 0; index < sample.length; index++) {
      const fullIndex = offset + index
      if (fullIndex < 0 || fullIndex >= full.length) continue
      matchingBits +=
        32 - popcount((full[fullIndex] ^ sample[index]) >>> 0)
      totalBits += 32
    }
    if (!totalBits) continue
    const similarity = matchingBits / totalBits
    if (!best || similarity > best.similarity) {
      best = { similarity, offset }
    }
  }
  return best
}

async function mapConcurrent(items, mapper) {
  const output = new Array(items.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      output[index] = await mapper(items[index], index)
      done++
      if (done % 20 === 0 || done === items.length) {
        process.stdout.write(`\rFingerprinted ${done}/${items.length}`)
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker)
  )
  process.stdout.write('\n')
  return output
}

await mkdir(cacheDir, { recursive: true })
const payload = await fetch(`${CMS_API_URL}/api/public/music`).then((response) => {
  if (!response.ok) throw new Error(`CMS returned ${response.status}`)
  return response.json()
})

const albums = []
for (const album of payload.albums) {
  const apple = await fetchAppleAlbum(album)
  albums.push({ album, apple })
}

const jobs = albums.flatMap(({ album, apple }) =>
  album.songs.map((song, index) => ({
    album,
    song,
    official: apple.tracks[index] ?? null,
    collectionId: apple.id,
    catalogError: apple.error,
    trackCountMatches: apple.tracks.length === album.songs.length,
  }))
)

const results = await mapConcurrent(jobs, async (job) => {
  const { album, song, official } = job
  const lyricsWindow = parseLyricsWindow(song.lyrics)
  const expectedSeconds = parseClock(song.duration)
  const officialSeconds = official?.trackTimeMillis
    ? official.trackTimeMillis / 1000
    : null
  let localFingerprint = null
  let previewFingerprint = null
  let match = null

  if (song.url && official?.previewUrl) {
    const localKey = `local-${song.id}`
    const previewKey = `apple-${official.trackId}`
    ;[localFingerprint, previewFingerprint] = await Promise.all([
      fingerprint(song.url, localKey),
      fingerprint(official.previewUrl, previewKey),
    ])
    if (localFingerprint.ok && previewFingerprint.ok) {
      match = compareFingerprints(
        localFingerprint.fingerprint,
        previewFingerprint.fingerprint
      )
    }
  }

  const similarity = match?.similarity ?? null
  const actualSeconds = localFingerprint?.ok
    ? localFingerprint.duration
    : null
  const durationDeltaFromOfficial =
    actualSeconds != null && officialSeconds != null
      ? Math.round((actualSeconds - officialSeconds) * 10) / 10
      : null
  const officialLengthMatches =
    durationDeltaFromOfficial != null &&
    Math.abs(durationDeltaFromOfficial) <= 8
  const studioStatus = !song.url
    ? 'missing'
    : !official
      ? 'catalog-unmatched'
      : !official.previewUrl
        ? 'no-official-preview'
        : similarity == null
          ? 'fingerprint-failed'
          : similarity >= 0.85
            ? officialLengthMatches
              ? 'verified-studio-master'
              : 'correct-master-wrong-length'
            : similarity >= 0.72
              ? 'probable-version-match'
              : 'wrong-version'
  return {
    id: song.id,
    artist: album.artist,
    album: album.name,
    name: song.name,
    officialName: official?.trackName ?? null,
    trackNumber: official?.trackNumber ?? null,
    trackCountMatches: job.trackCountMatches,
    url: song.url ?? null,
    expectedSeconds,
    officialSeconds,
    actualSeconds,
    durationDeltaFromOfficial,
    fingerprintSimilarity:
      similarity == null ? null : Math.round(similarity * 10_000) / 10_000,
    fingerprintOffsetSeconds:
      match && localFingerprint?.fingerprint?.length
        ? Math.round(
            match.offset *
              (localFingerprint.duration / localFingerprint.fingerprint.length) *
              10
          ) / 10
        : null,
    studioStatus,
    hasLyrics: Boolean(song.lyrics),
    lyricsWindow,
    lyricsWithinAudio:
      lyricsWindow && actualSeconds != null
        ? lyricsWindow.last <= actualSeconds + 15
        : null,
    catalogError: job.catalogError,
  }
})

const count = (status) => results.filter((item) => item.studioStatus === status).length
const summary = {
  generatedAt: new Date().toISOString(),
  albums: payload.albums.length,
  songs: results.length,
  playable: results.filter((item) => item.url).length,
  verifiedStudioMaster: count('verified-studio-master'),
  correctMasterWrongLength: count('correct-master-wrong-length'),
  probableVersionMatch: count('probable-version-match'),
  wrongVersion: count('wrong-version'),
  missing: count('missing'),
  catalogUnmatched: count('catalog-unmatched'),
  noOfficialPreview: count('no-official-preview'),
  fingerprintFailed: count('fingerprint-failed'),
  lyricsPresent: results.filter((item) => item.hasLyrics).length,
  lyricsWithinAudio: results.filter((item) => item.lyricsWithinAudio === true)
    .length,
  lyricsExceedAudio: results.filter((item) => item.lyricsWithinAudio === false)
    .length,
}

await writeFile(
  path.join(outputDir, 'music-studio-validation.json'),
  `${JSON.stringify({ summary, results }, null, 2)}\n`
)

const lines = [
  '# Studio audio validation',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  '| Songs | Playable | Verified complete studio master | Correct master, wrong length | Probable | Wrong version | Missing | Catalog unmatched | No preview | Fingerprint failed | Lyrics exceed audio |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  `| ${summary.songs} | ${summary.playable} | ${summary.verifiedStudioMaster} | ${summary.correctMasterWrongLength} | ${summary.probableVersionMatch} | ${summary.wrongVersion} | ${summary.missing} | ${summary.catalogUnmatched} | ${summary.noOfficialPreview} | ${summary.fingerprintFailed} | ${summary.lyricsExceedAudio} |`,
  '',
  '## Requires attention',
  '',
  ...results
    .filter(
      (item) =>
        item.studioStatus !== 'verified-studio-master' ||
        item.lyricsWithinAudio === false
    )
    .map(
      (item) =>
        `- ${item.artist} / ${item.album} / ${item.name}: ${item.studioStatus}; fingerprint ${item.fingerprintSimilarity ?? '-'}; official ${item.officialSeconds ?? '-'}s; actual ${item.actualSeconds ?? '-'}s; lyrics ${item.lyricsWithinAudio === false ? 'exceed audio' : item.hasLyrics ? 'bounded' : 'missing'}`
    ),
  '',
]
await writeFile(
  path.join(outputDir, 'music-studio-validation.md'),
  `${lines.join('\n')}\n`
)

console.log(JSON.stringify(summary, null, 2))
