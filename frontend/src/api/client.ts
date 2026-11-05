/**
 * Small fetch wrapper for the Laravel API.
 *
 * The SPA is served from the same origin as the API, so Sanctum authenticates
 * with the session cookie. Before the first state-changing request we ask
 * Laravel for the XSRF-TOKEN cookie and send it back as a header.
 */

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly errors: ValidationErrors
  /** Machine-readable reason sent by the API, e.g. "email_unverified". */
  readonly code?: string

  constructor(status: number, message: string, errors: ValidationErrors = {}, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.code = code
  }

  /** First message for a field, handy for showing it under an input. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

const API_PREFIX = '/api/v1'

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

let csrfReady: Promise<void> | null = null

/** Websocket id of this tab: the API then skips echoing our own changes back to us. */
let socketId: string | null = null
export function setSocketId(id: string | null) {
  socketId = id
}

/** XSRF header value for requests made outside this wrapper (websocket auth). */
export function xsrfToken(): string | null {
  return readCookie('XSRF-TOKEN')
}

export { ensureCsrfCookie }

function ensureCsrfCookie(): Promise<void> {
  if (readCookie('XSRF-TOKEN')) return Promise.resolve()
  csrfReady ??= fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' }).then(() => undefined)
  return csrfReady
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (method !== 'GET') await ensureCsrfCookie()

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  if (socketId) headers['X-Socket-ID'] = socketId

  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 419) csrfReady = null
    throw new ApiError(response.status, data.message ?? 'Error inesperado', data.errors ?? {}, data.code)
  }

  return data as T
}
