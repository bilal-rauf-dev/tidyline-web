import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const listeners = new Map()
const stores = new Map()
let offline = false

function cacheFor(name) {
  if (!stores.has(name)) stores.set(name, new Map())
  const entries = stores.get(name)
  const key = (request) => typeof request === 'string'
    ? request
    : new URL(request.url).pathname
  return {
    addAll: async (urls) => {
      for (const url of urls) entries.set(url, new Response(`cached:${url}`))
    },
    match: async (request) => entries.get(key(request))?.clone() ?? null,
    put: async (request, response) => { entries.set(key(request), response.clone()) },
  }
}

const context = {
  self: {
    location: { origin: 'http://localhost' },
    addEventListener: (name, handler) => listeners.set(name, handler),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  },
  caches: {
    open: async (name) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  },
  fetch: async (request) => {
    if (offline) throw new Error('network unavailable')
    return new Response(`network:${request.url}`)
  },
  Response,
  URL,
}

vm.runInNewContext(await readFile('dist/sw.js', 'utf8'), context)
assert.equal(listeners.has('install'), true)
assert.equal(listeners.has('fetch'), true)

let installWork
listeners.get('install')({ waitUntil: (promise) => { installWork = promise } })
await installWork
const cacheName = [...stores.keys()][0]
const entries = stores.get(cacheName)
assert.equal(entries.has('/'), true)
assert.equal([...entries.keys()].some((url) => url.endsWith('.js')), true)
assert.equal([...entries.keys()].some((url) => url.endsWith('.css')), true)

let statusWork
let statusMessage
listeners.get('message')({
  data: { type: 'tidyline:offline-status' },
  ports: [{ postMessage: (message) => { statusMessage = message } }],
  waitUntil: (promise) => { statusWork = promise },
})
await statusWork
assert.equal(statusMessage.ready, true)

offline = true
async function fetchThroughWorker(path, mode = 'navigate') {
  let responsePromise
  listeners.get('fetch')({
    request: { method: 'GET', mode, url: `http://localhost${path}` },
    respondWith: (promise) => { responsePromise = promise },
  })
  return responsePromise ? await responsePromise : null
}

const route = await fetchThroughWorker('/board')
assert.equal(await route.text(), 'cached:/')
const assetPath = [...entries.keys()].find((url) => url.endsWith('.js'))
const asset = await fetchThroughWorker(assetPath, 'same-origin')
assert.equal(await asset.text(), `cached:${assetPath}`)
assert.equal(await fetchThroughWorker('/api/tasks', 'same-origin'), null)

console.log('ok    Production worker reports a complete cache and restores a route and asset offline')
