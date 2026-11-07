/*
 * Push notifications. Imported by the PWA service worker (production) and
 * registered on its own during development.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'eLigned', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'eLigned'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge,
      tag: data.tag,
      data: data.data || {},
    }),
  )
})

// Opens (or focuses) the app on the task the notification is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) {
        return open.focus().then((w) => (w && 'navigate' in w ? w.navigate(url) : undefined))
      }
      return self.clients.openWindow(url)
    }),
  )
})

// Development only: no caching, take over right away.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
