import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CMS_API_URL = process.env.CMS_API_URL
const CONCURRENCY = Math.max(
  1,
  Number(process.env.MUSIC_AUDIT_CONCURRENCY) || 20
)
const PROBE_TIMEOUT_MS = Math.max(
  3_000,
  Number(process.env.MUSIC_AUDIT_TIMEOUT_MS) || 20_000
)
const outputDir = path.resolve(process.env.MUSIC_AUDIT_OUTPUT || 'reports')
const qualityOutput = path.resolve(
  process.env.MUSIC_QUALITY_OUTPUT || 'src/content/music/audio-quality.json'
)

if (!CMS_API_URL) throw new Error('CMS_API_URL is not configured')

function parseClock(value) {
  const parts = String(value || '')
    .trim()
    .split(':')
    .map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return 0
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function formatClock(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function parseLyricsWindow(lyrics) {
  const stamps = [
    ...String(lyrics || '').matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g),
  ]
    .map((match) => Number(match[1]) * 60 + Number(match[2]))
    .filter(Number.isFinite)
  return stamps.length
    ? { first: Math.min(...stamps), last: Math.max(...stamps) }
    : null
}

function probe(url) {
  return new Promise((resolve) => {
    const child = spawn(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration,format_name,size',
        '-of',
        'json',
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), PROBE_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolve({
          ok: false,
          error: signal === 'SIGKILL' ? 'probe timeout' : stderr.trim(),
        })
        return
      }
      try {
        const format = JSON.parse(stdout).format || {}
        resolve({
          ok: true,
          actualSeconds: Number(format.duration) || 0,
          format: format.format_name || null,
          size: Number(format.size) || 0,
        })
      } catch (error) {
        resolve({ ok: false, error: String(error) })
      }
    })
  })
}

async function mapConcurrent(items, mapper) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index], index)
      if ((index + 1) % 25 === 0 || index + 1 === items.length) {
        process.stdout.write(`\rProbed ${index + 1}/${items.length}`)
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker)
  )
  process.stdout.write('\n')
  return results
}

const response = await fetch(`${CMS_API_URL}/api/public/music`)
if (!response.ok) {
  throw new Error(
    `Music API returned ${response.status} ${response.statusText}`
  )
}

const payload = await response.json()
const songs = payload.albums.flatMap((album) =>
  album.songs.map((song) => {
    const { lyrics, ...songData } = song
    return {
      albumId: album.id,
      album: album.name,
      artist: album.artist,
      ...songData,
      hasLyrics: Boolean(lyrics),
      expectedSeconds: parseClock(song.duration),
      lyricsWindow: parseLyricsWindow(lyrics),
    }
  })
)
const playable = songs.filter((song) => song.url)
const missing = songs.filter((song) => !song.url)

const probed = await mapConcurrent(playable, async (song) => ({
  ...song,
  ...(await probe(song.url)),
}))

for (const song of probed) {
  song.deltaSeconds = song.ok
    ? Math.round((song.actualSeconds - song.expectedSeconds) * 10) / 10
    : null
  song.issues = []
  if (!song.ok) song.issues.push('unreachable')
  if (!song.ok) continue
  if (song.actualSeconds < 45 && song.expectedSeconds >= 90) {
    song.issues.push('severely-truncated')
  } else if (song.actualSeconds + 12 < song.expectedSeconds) {
    song.issues.push('truncated-or-wrong-version')
  }
  if (song.actualSeconds - song.expectedSeconds > 15) {
    song.issues.push('extended-or-mv-version')
  }
  // Album metadata and encoded files commonly differ by a few seconds. Only
  // flag lyrics when their final timestamp clearly runs past the audio.
  if (song.lyricsWindow && song.lyricsWindow.last > song.actualSeconds + 15) {
    song.issues.push('lyrics-exceed-audio')
  }
}

const suspects = probed.filter((song) => song.issues.length)
const summary = {
  generatedAt: new Date().toISOString(),
  albums: payload.albums.length,
  songs: songs.length,
  playable: playable.length,
  missing: missing.length,
  unreachable: suspects.filter((song) => song.issues.includes('unreachable'))
    .length,
  truncated: suspects.filter((song) =>
    song.issues.some((issue) => issue.includes('truncated'))
  ).length,
  extendedOrMv: suspects.filter((song) =>
    song.issues.includes('extended-or-mv-version')
  ).length,
  lyricsRisk: suspects.filter((song) =>
    song.issues.some((issue) => issue.startsWith('lyrics-'))
  ).length,
}

const report = { summary, missing, suspects, probed }
await mkdir(outputDir, { recursive: true })
await writeFile(
  path.join(outputDir, 'music-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`
)

const lines = [
  '# Music library audit',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  '| Albums | Songs | Playable | Missing | Unreachable | Truncated | Extended/MV | Lyrics risk |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  `| ${summary.albums} | ${summary.songs} | ${summary.playable} | ${summary.missing} | ${summary.unreachable} | ${summary.truncated} | ${summary.extendedOrMv} | ${summary.lyricsRisk} |`,
  '',
  '## Missing audio',
  '',
  ...missing.map(
    (song) => `- ${song.artist} / ${song.album} / ${song.name} (${song.id})`
  ),
  '',
  '## Invalid or version-mismatched audio',
  '',
  ...suspects.map(
    (song) =>
      `- ${song.artist} / ${song.album} / ${song.name}: expected ${song.duration}, actual ${song.ok ? formatClock(song.actualSeconds) : 'unreachable'}; ${song.issues.join(', ')}`
  ),
  '',
]
await writeFile(path.join(outputDir, 'music-audit.md'), `${lines.join('\n')}\n`)

const qualityManifest = {
  generatedAt: summary.generatedAt,
  songs: Object.fromEntries(
    probed
      .filter((song) => song.issues.length)
      .map((song) => {
        const incomplete =
          !song.ok ||
          song.actualSeconds + 30 < song.expectedSeconds ||
          (song.actualSeconds < 90 && song.expectedSeconds >= 120)
        const lyricsMismatch = Boolean(
          song.lyricsWindow &&
          (incomplete ||
            song.lyricsWindow.last > song.actualSeconds + 15)
        )
        return [
          song.id,
          {
            actualSeconds: Math.round(song.actualSeconds * 10) / 10,
            expectedSeconds: song.expectedSeconds,
            incomplete,
            lyricsMismatch,
            issues: song.issues,
          },
        ]
      })
  ),
}
await mkdir(path.dirname(qualityOutput), { recursive: true })
await writeFile(qualityOutput, `${JSON.stringify(qualityManifest, null, 2)}\n`)

console.log(JSON.stringify(summary, null, 2))
