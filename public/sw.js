/*
 * Minimal service worker. Its only job is to host notifications that carry
 * action buttons — the plain Notification constructor cannot render actions.
 *
 * It deliberately does NOT cache, sync, or handle push. Task data lives in
 * localStorage, which is unreachable from a worker, so every action is
 * forwarded to an open page which owns the mutation.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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

      clientList.forEach((client) => {
        client.postMessage({
          source: 'tidyline-notification',
          action: action || 'open',
          taskId: data.taskId,
          reminderId: data.reminderId,
        })
      })

      if (clientList.length > 0 && 'focus' in clientList[0]) {
        await clientList[0].focus()
      }
    })(),
  )
})
