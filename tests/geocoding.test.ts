import { afterEach, describe, expect, test, vi } from 'vitest'
import { reverseGeocode, searchCity } from '../src/services/geocoding'

describe('geocoding client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('searches through the local geocoding endpoint', async () => {
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => new Response(JSON.stringify({
      location: {
        label: 'Lyon, France',
        latitude: 45.764,
        longitude: 4.8357
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(searchCity(' Lyon ')).resolves.toEqual({
      label: 'Lyon, France',
      latitude: 45.764,
      longitude: 4.8357
    })
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/geocode?')
    expect(String(fetchMock.mock.calls[0][0])).toContain('type=search')
  })

  test('cancels an outdated reverse-geocoding request', async () => {
    const fetchMock = vi.fn((
      _url: RequestInfo | URL,
      init?: RequestInit
    ) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(init.signal?.reason)
      }, { once: true })
    }))

    vi.stubGlobal('fetch', fetchMock)

    const controller = new AbortController()
    const request = reverseGeocode(48, 2, controller.signal)

    await Promise.resolve()
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('reports a useful error when the server returns HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      '<!doctype html><title>Error</title>',
      {
        status: 502,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    )))

    await expect(searchCity('not-a-city')).rejects.toThrow(
      'City search error 502'
    )
  })

  test('preserves a useful JSON error from the server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'City not found' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )))

    await expect(searchCity('not-a-city')).rejects.toThrow('City not found')
  })
})
