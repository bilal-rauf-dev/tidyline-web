import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const html = await readFile('dist/index.html', 'utf8')
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
if (assets.length === 0) throw new Error('No built assets found in dist/index.html')

const urls = [...new Set(['/', '/index.html', '/manifest.webmanifest', '/logo.svg', '/logo.png', '/icons.svg', ...assets])]
const buildId = createHash('sha256').update(html).digest('hex').slice(0, 12)
const worker = await readFile('dist/sw.js', 'utf8')
const built = worker
  .replace('false /* BUILD_CACHE_ENABLED */', 'true')
  .replace("'tidyline-shell-dev' /* BUILD_CACHE_NAME */", `'tidyline-shell-${buildId}'`)
  .replace('[] /* BUILD_PRECACHE */', JSON.stringify(urls))

if (built === worker || built.includes('BUILD_PRECACHE')) {
  throw new Error('Could not inject the service worker build manifest')
}
await writeFile('dist/sw.js', built)
console.log(`Service worker precaches ${urls.length} core URLs`)
