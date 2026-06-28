import type { WeatherLocation } from '../types/weather'

type OpenMeteoGeocodingResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[]
}

type NominatimReverseResponse = {
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    suburb?: string
    county?: string
    state?: string
    country?: string
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      zoom: '10',
      addressdetails: '1',
      'accept-language': 'en'
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { 'User-Agent': 'Aether Weather Map' }
    })

    if (!response.ok) {
      return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
    }

    const payload = (await response.json()) as NominatimReverseResponse
    const address = payload.address

    if (!address) {
      return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
    }

    const locality = address.city || address.town || address.village || address.hamlet || address.suburb || address.county
    const region = address.state || address.country

    if (locality && region) {
      return `${locality}, ${region}`
    }

    if (locality) {
      return locality
    }

    return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
  } catch {
    return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
  }
}

export async function searchCity(query: string): Promise<WeatherLocation> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    throw new Error('Enter city')
  }

  const params = new URLSearchParams({
    name: trimmedQuery,
    count: '1',
    language: 'en',
    format: 'json'
  })

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`City search error ${response.status}`)
  }

  const payload = (await response.json()) as OpenMeteoGeocodingResponse
  const result = payload.results?.[0]

  if (!result) {
    throw new Error('City not found')
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    label: [result.name, result.admin1, result.country].filter(Boolean).join(', ')
  }
}
