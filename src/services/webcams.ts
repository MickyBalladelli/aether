import type { NearbyWebcams, WeatherLocation } from '../types/weather'
import { fetchWithTimeout } from '../../shared/fetchTimeout.js'

export async function fetchNearbyWebcams(
  location: WeatherLocation,
  signal?: AbortSignal
): Promise<NearbyWebcams> {
  const params = new URLSearchParams({
    resource: 'webcams',
    latitude: String(location.latitude),
    longitude: String(location.longitude)
  })
  const response = await fetchWithTimeout(`/api/weather?${params}`, { signal })
  const payload = await readPayload(response)

  if (!response.ok) {
    if (payload?.configured === false) {
      return {
        configured: false,
        radiusKm: 100,
        total: 0,
        webcams: []
      }
    }

    throw new Error(payload?.error ?? `Webcam error ${response.status}`)
  }

  if (!isNearbyWebcams(payload)) {
    throw new Error('Invalid webcam response')
  }

  return payload
}

async function readPayload(response: Response) {
  try {
    return await response.json() as Partial<NearbyWebcams> & { error?: string }
  } catch {
    return null
  }
}

function isNearbyWebcams(value: unknown): value is NearbyWebcams {
  if (!value || typeof value !== 'object') return false

  const result = value as NearbyWebcams

  return (
    result.configured === true &&
    Number.isFinite(result.radiusKm) &&
    Number.isFinite(result.total) &&
    Array.isArray(result.webcams) &&
    result.webcams.every(webcam => (
      Number.isFinite(webcam.id) &&
      typeof webcam.title === 'string' &&
      Number.isFinite(webcam.distanceKm) &&
      typeof webcam.playerUrl === 'string' &&
      typeof webcam.detailUrl === 'string'
    ))
  )
}
