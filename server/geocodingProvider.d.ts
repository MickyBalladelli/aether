export type GeocodeRequest =
  | { type: 'search', query: string, cacheKey: string }
  | {
      type: 'reverse'
      latitude: number
      longitude: number
      cacheKey: string
    }

export function parseGeocodeRequest(
  params: URLSearchParams
): GeocodeRequest | null

export function fetchGeocode(
  request: GeocodeRequest
): Promise<{
  label?: string
  location?: {
    label: string
    latitude: number
    longitude: number
  }
}>
