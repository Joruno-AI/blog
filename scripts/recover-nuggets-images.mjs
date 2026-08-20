import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const run = promisify(execFile)
const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')
const catalogPath = resolve(projectRoot, 'src/data/nuggets-catalog.json')
const manifestPath = resolve(
  projectRoot,
  'src/data/nuggets-image-fallbacks.json'
)
const assetDirectory = resolve(projectRoot, 'public/docs-assets/nuggets/xitu')
const targetCourse =
  process.env.NUGGETS_IMAGE_COURSE || '10+ 代码案例掌握 NodeJS 核心基础知识'
const deadImageHost = 'user-gold-cdn.xitu.io'

function encodePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function getImageUrls(markdown) {
  const expression =
    /!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g
  return [...markdown.matchAll(expression)].map((match) => match[1])
}

function isRecoverable(url) {
  try {
    return new URL(url).hostname === deadImageHost
  } catch {
    return false
  }
}

function assetName(url) {
  return `${createHash('sha256').update(url).digest('hex').slice(0, 20)}.webp`
}

function naturalFileSort(a, b) {
  return a.localeCompare(b, 'en', { numeric: true })
}

async function alignExtractedImages(directory, files, imageUrls) {
  if (files.length === imageUrls.length) return files

  const metadata = await Promise.all(
    files.map((file) => sharp(join(directory, file)).metadata())
  )
  const aligned = []
  let cursor = 0

  for (const imageUrl of imageUrls) {
    const url = new URL(imageUrl)
    const width = Number(url.searchParams.get('w'))
    const height = Number(url.searchParams.get('h'))
    if (!width || !height) return null

    const matchIndex = metadata.findIndex(
      (item, index) =>
        index >= cursor && item.width === width && item.height === height
    )
    if (matchIndex < 0) return null
    aligned.push(files[matchIndex])
    cursor = matchIndex + 1
  }

  return aligned
}

async function fetchSource(path) {
  const encodedPath = encodePath(path)
  const urls = [
    `${sourceBase}/${encodedPath}`,
    `https://raw.githubusercontent.com/${catalog.repository}/${catalog.commit}/${encodedPath}`,
  ]

  for (const url of urls) {
    const response = await fetch(url)
    if (response.ok) return response
  }

  return null
}

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const sourceBase = `https://cdn.jsdelivr.net/gh/${catalog.repository}@${catalog.commit}`
const course = catalog.categories
  .flatMap((category) => category.courses)
  .find((item) => item.name === targetCourse)

if (!course) throw new Error(`Course not found: ${targetCourse}`)

let manifest = {}
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch {
  // The first recovery run starts with an empty manifest.
}

await mkdir(assetDirectory, { recursive: true })
const workingDirectory = await mkdtemp(join(tmpdir(), 'nuggets-images-'))
let recovered = 0
let skipped = 0

try {
  await run('pdfimages', ['-v'])

  for (const [articleIndex, article] of course.articles.entries()) {
    const markdownResponse = await fetchSource(article.path)
    if (!markdownResponse) {
      console.warn(`Skip ${article.path}: Markdown unavailable.`)
      skipped += 1
      continue
    }

    const markdown = await markdownResponse.text()
    const imageUrls = getImageUrls(markdown)
    const recoverableUrls = imageUrls.filter(isRecoverable)
    if (recoverableUrls.length === 0) continue

    const pdfPath = article.path.replace(/\.md$/i, '.pdf')
    const pdfResponse = await fetchSource(pdfPath)
    if (!pdfResponse) {
      console.warn(`Skip ${article.path}: PDF unavailable.`)
      skipped += recoverableUrls.length
      continue
    }

    const articleDirectory = join(
      workingDirectory,
      String(articleIndex).padStart(3, '0')
    )
    await mkdir(articleDirectory, { recursive: true })
    const localPdf = join(articleDirectory, 'article.pdf')
    await writeFile(localPdf, new Uint8Array(await pdfResponse.arrayBuffer()))
    const imagePrefix = join(articleDirectory, 'image')
    await run('pdfimages', ['-j', localPdf, imagePrefix])
    const extracted = (await readdir(articleDirectory))
      .filter((file) => basename(file).startsWith('image-'))
      .filter((file) =>
        ['.jpg', '.jpeg', '.png', '.ppm', '.pgm', '.pbm'].includes(
          extname(file).toLowerCase()
        )
      )
      .sort(naturalFileSort)

    const alignedImages = await alignExtractedImages(
      articleDirectory,
      extracted,
      imageUrls
    )
    if (!alignedImages) {
      console.warn(
        `Skip ${article.path}: ${imageUrls.length} Markdown images, ` +
          `${extracted.length} PDF images.`
      )
      skipped += recoverableUrls.length
      continue
    }

    for (const [imageIndex, originalUrl] of imageUrls.entries()) {
      if (!isRecoverable(originalUrl)) continue
      const filename = assetName(originalUrl)
      await sharp(join(articleDirectory, alignedImages[imageIndex]))
        .webp({ quality: 84, effort: 4 })
        .toFile(join(assetDirectory, filename))
      manifest[originalUrl] = `/docs-assets/nuggets/xitu/${filename}`
      recovered += 1
    }
  }
} finally {
  await rm(workingDirectory, { recursive: true, force: true })
}

manifest = Object.fromEntries(
  Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
)
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(
  `Recovered ${recovered} images for ${targetCourse}; skipped ${skipped}.`
)
