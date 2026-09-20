/*
 * Notification actions are forwarded to an open page, which owns task state.
 * Production builds also precache the app shell and assets for offline reload.
 */

const CACHE_ENABLED = false /* BUILD_CACHE_ENABLED */
const CACHE_NAME = 'tidyline-shell-dev' /* BUILD_CACHE_NAME */
const PRECACHE_URLS = [] /* BUILD_PRECACHE */

self.addEventListener('install', (event) => {
  if (!CACHE_ENABLED) {
    self.skipWaiting()
    return
  }
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (CACHE_ENABLED) {
      const names = await caches.keys()
      await Promise.all(names
        .filter((name) => name.startsWith('tidyline-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)))
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (!CACHE_ENABLED || event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      const cachedShell = await cache.match('/')

      try {
        const response = await fetch(event.request)
        return response.ok ? response : cachedShell || response
      } catch {
        return cachedShell || Response.error()
      }
    })())
    return
  }

  const staticAsset = url.pathname.startsWith('/assets/') ||
    ['/manifest.webmanifest', '/logo.svg', '/logo.png', '/icons.svg', '/preview.png', '/future_banner.png'].includes(url.pathname)
  if (!staticAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(event.request)
    if (cached) return cached
    const response = await fetch(event.request)
    if (response.ok) await cache.put(event.request, response.clone())
    return response
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'tidyline:offline-status' || !event.ports?.[0]) return
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const entries = await Promise.all(PRECACHE_URLS.map((url) => cache.match(url)))
    event.ports[0].postMessage({ ready: CACHE_ENABLED && entries.every(Boolean) })
  })())
})

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {}
    try {
      payload = event.data?.json() ?? {}
    } catch {
      payload = { body: event.data?.text() ?? '' }
    }

    const taskId = typeof payload.taskId === 'string' ? payload.taskId : null
    const reminderId = typeof payload.reminderId === 'string' ? payload.reminderId : 'background'
    const url = typeof payload.url === 'string' && payload.url.startsWith('/') && !payload.url.startsWith('//')
      ? payload.url
      : '/board'

    await self.registration.showNotification(payload.title || 'TidyLine reminder', {
      body: payload.body || 'A task reminder is due.',
      tag: taskId ? `${taskId}:${reminderId}` : `tidyline:${reminderId}`,
      icon: '/logo.png',
      timestamp: Date.parse(payload.scheduledFor) || undefined,
      data: { taskId, reminderId, url },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  const { action } = event
  const data = event.notification.data || {}

  event.notification.close()

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const targetPath = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
        ? data.url
        : '/board'
      const targetUrl = new URL(targetPath, self.location.origin).href

      clientList.forEach((client) => {
        client.postMessage({
          source: 'tidyline-notification',
          action: action || 'open',
          taskId: data.taskId,
          reminderId: data.reminderId,
        })
      })

      if (clientList.length > 0 && 'focus' in clientList[0]) {
        if ('navigate' in clientList[0]) await clientList[0].navigate(targetUrl)
        await clientList[0].focus()
      } else if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
