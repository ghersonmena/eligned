import Echo from 'laravel-echo'
import Pusher, { type ChannelAuthorizationCallback } from 'pusher-js'
import { ensureCsrfCookie, setSocketId, xsrfToken } from '../api/client'

/**
 * One websocket connection (Laravel Reverb through nginx at /app) for the
 * whole app. Null when the server has realtime turned off.
 */
let echo: Echo<'reverb'> | null = null
let starting: Promise<Echo<'reverb'> | null> | null = null

export function startRealtime(): Promise<Echo<'reverb'> | null> {
  starting ??= (async () => {
    const config = await fetch('/api/v1/config', { headers: { Accept: 'application/json' } })
      .then((r) => r.json() as Promise<{ realtime: { key: string } | null }>)
      .catch(() => null)
    if (!config?.realtime) return null
    await ensureCsrfCookie()

    const secure = location.protocol === 'https:'
    const port = Number(location.port) || (secure ? 443 : 80)
    echo = new Echo({
      broadcaster: 'reverb',
      Pusher,
      key: config.realtime.key,
      wsHost: location.hostname,
      wsPort: port,
      wssPort: port,
      forceTLS: secure,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: '/api/broadcasting/auth',
      // Sends the session cookie and a fresh XSRF token (it can rotate while the tab is open).
      authorizer: (channel: { name: string }) => ({
        authorize: (socket: string, callback: ChannelAuthorizationCallback) => {
          fetch('/api/broadcasting/auth', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken() ?? '' },
            body: JSON.stringify({ socket_id: socket, channel_name: channel.name }),
          })
            .then(async (r) =>
              r.ok ? callback(null, (await r.json()) as Parameters<ChannelAuthorizationCallback>[1]) : callback(new Error(`auth ${r.status}`), null),
            )
            .catch((e: Error) => callback(e, null))
        },
      }),
    })
    echo.connector.pusher.connection.bind('connected', () => setSocketId(echo?.socketId() ?? null))
    echo.connector.pusher.connection.bind('disconnected', () => setSocketId(null))
    return echo
  })()
  return starting
}

export function stopRealtime() {
  echo?.disconnect()
  echo = null
  starting = null
  setSocketId(null)
}
