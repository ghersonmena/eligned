import { api } from '../api/client'

export type PushState = 'unsupported' | 'insecure' | 'denied' | 'off' | 'on'

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * The service worker that shows pushes. In production it's the PWA worker
 * (which imports push-sw.js); in development we register push-sw.js itself.
 */
async function registration(): Promise<ServiceWorkerRegistration> {
  if (import.meta.env.DEV) {
    const existing = await navigator.serviceWorker.getRegistration('/')
    return existing ?? navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
  }
  return navigator.serviceWorker.ready
}

export async function pushState(): Promise<PushState> {
  if (!window.isSecureContext) return 'insecure'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** Asks permission, subscribes this browser and tells the server. */
export async function enablePush(publicKey: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
  const json = sub.toJSON()
  const encodings = (PushManager as unknown as { supportedContentEncodings?: string[] }).supportedContentEncodings
  await api('POST', '/push-subscriptions', {
    endpoint: json.endpoint,
    keys: json.keys,
    content_encoding: encodings?.includes('aes128gcm') ? 'aes128gcm' : (encodings?.[0] ?? 'aes128gcm'),
  })
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await api('POST', '/push-subscriptions/delete', { endpoint: sub.endpoint })
    await sub.unsubscribe()
  }
  return 'off'
}

export function sendTestPush(): Promise<void> {
  return api('POST', '/push-subscriptions/test')
}

/** Public settings from the server (cached for the session). */
let configPromise: Promise<{ push: { public_key: string } | null }> | null = null
export function serverConfig() {
  configPromise ??= fetch('/api/v1/config', { headers: { Accept: 'application/json' } }).then((r) => r.json())
  return configPromise
}
