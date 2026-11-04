import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('api', () => {
  it('asks for the CSRF cookie before a POST and sends it back as a header', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/sanctum/csrf-cookie') {
        document.cookie = 'XSRF-TOKEN=abc%3D'
        return new Response(null, { status: 204 })
      }
      return jsonResponse(200, { data: { ok: true } })
    })
    vi.stubGlobal('fetch', fetchMock)

    await api('POST', '/auth/login', { email: 'a@b.c' })

    expect(fetchMock.mock.calls[0][0]).toBe('/sanctum/csrf-cookie')
    const [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('abc=')
  })

  it('turns a 422 into an ApiError with field messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(422, { message: 'Invalid', errors: { email: ['Taken'] } })))

    const error = await api('GET', '/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).fieldError('email')).toBe('Taken')
  })
})
