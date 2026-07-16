import { fetchCoalesced } from './coalescedFetch.js'

export type OfficialHeatAlert = {
  id: string
  title: string
  message: string
  severity: 'warning' | 'error'
  source: string
}

type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

const NWS_ALERTS_ENDPOINT = 'https://api.weather.gov/alerts/active'
const METEOGATE_WARNINGS_ENDPOINT = 'https://api.meteogate.eu/warnings/collections/warnings/locations/ALL'
const HEAT_EVENT_PATTERN = /heat/i
const METEOGATE_HEAT_TYPE = '5'
const METEOGATE_INTERVAL_MS = 23 * 60 * 60 * 1000
const METEOGATE_BUCKET_MS = 10 * 60 * 1000

export function parseHeatAlertCoordinates(
  latitudeValue: unknown,
  longitudeValue: unknown
): { latitude: number, longitude: number } | null {
  const latitude = Number(latitudeValue)
  const longitude = Number(longitudeValue)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return {
    latitude: normalizeCoordinate(latitude),
    longitude: normalizeCoordinate(longitude)
  }
}

export async function getOfficialHeatAlerts(
  latitude: number,
  longitude: number
): Promise<OfficialHeatAlert[]> {
  if (isLikelyUnitedStates(latitude, longitude)) {
    return getNwsHeatAlerts(latitude, longitude)
  }

  if (isLikelyEurope(latitude, longitude) && process.env.METEOGATE_KEY) {
    return getMeteoGateHeatAlerts(latitude, longitude)
  }

  return []
}

async function getNwsHeatAlerts(
  latitude: number,
  longitude: number
): Promise<OfficialHeatAlert[]> {
  const point = `${latitude.toFixed(3)},${longitude.toFixed(3)}`
  const url = new URL(NWS_ALERTS_ENDPOINT)

  url.searchParams.set('point', point)
  url.searchParams.set('status', 'actual')

  const response = await fetchCoalesced(
    `nws-heat:${point}`,
    url.toString(),
    'Aether Weather Map (https://aether-five-rose.vercel.app)',
    {},
    'heat-alerts'
  )

  if (response.status === 400) {
    return []
  }

  if (!response.ok) {
    throw new Error(`NWS alerts error ${response.status}`)
  }

  const payload = JSON.parse(response.body) as {
    features?: Array<{ properties?: Record<string, unknown> }>
  }
  const features = Array.isArray(payload.features) ? payload.features : []

  return features
    .map(feature => feature?.properties)
    .filter((properties): properties is Record<string, unknown> & {
      event: string
    } => (
      Boolean(properties) &&
      typeof properties.event === 'string' &&
      HEAT_EVENT_PATTERN.test(properties.event)
    ))
    .map(properties => ({
      id: String(properties.id ?? properties['@id'] ?? properties.event),
      title: properties.event,
      message: getAlertMessage(properties),
      severity: getAlertSeverity(properties),
      source: 'US National Weather Service'
    }))
}

async function getMeteoGateHeatAlerts(
  latitude: number,
  longitude: number
): Promise<OfficialHeatAlert[]> {
  const bucketEnd = Math.floor(Date.now() / METEOGATE_BUCKET_MS) * METEOGATE_BUCKET_MS
  const bucketStart = bucketEnd - METEOGATE_INTERVAL_MS
  const interval = `${new Date(bucketStart).toISOString()}/${new Date(bucketEnd).toISOString()}`
  const url = new URL(METEOGATE_WARNINGS_ENDPOINT)

  url.searchParams.set('datetime', interval)
  url.searchParams.set('awareness_type', METEOGATE_HEAT_TYPE)
  url.searchParams.set('language', 'en')
  url.searchParams.set('f', 'json')

  const response = await fetchCoalesced(
    `meteogate-heat:${bucketEnd}`,
    url.toString(),
    'Aether Weather Map (https://aether-five-rose.vercel.app)',
    {
      apikey: process.env.METEOGATE_KEY
    },
    'heat-alerts'
  )

  if (response.status === 204) {
    return []
  }

  if (!response.ok) {
    throw new Error(`MeteoGate warnings error ${response.status}`)
  }

  const payload = JSON.parse(response.body) as {
    features?: Array<{
      id?: unknown
      geometry?: unknown
      properties?: Record<string, unknown>
    }>
  }
  const features = Array.isArray(payload.features) ? payload.features : []
  const alerts = new Map<string, OfficialHeatAlert>()

  for (const feature of features) {
    const properties = feature?.properties

    if (
      !properties ||
      properties.supersededAt ||
      !geometryContainsPoint(feature.geometry, latitude, longitude)
    ) {
      continue
    }

    const alertId = String(properties.alertId ?? feature.id)

    alerts.set(alertId, {
      id: `meteogate:${alertId}`,
      title: 'Official high-temperature warning',
      message: 'A European meteorological service has issued a heat warning for this area.',
      severity: 'warning',
      source: 'MeteoAlarm via MeteoGate'
    })
  }

  return [...alerts.values()]
}

function getAlertMessage(properties: Record<string, unknown>) {
  const headline = typeof properties.headline === 'string'
    ? properties.headline.trim()
    : ''

  if (headline) {
    return headline
  }

  return 'Official heat warning is active. Follow local safety guidance.'
}

function getAlertSeverity(
  properties: Record<string, unknown>
): OfficialHeatAlert['severity'] {
  return properties.severity === 'Extreme' ||
    (typeof properties.event === 'string' && /excessive/i.test(properties.event))
    ? 'error'
    : 'warning'
}

function isLikelyUnitedStates(latitude: number, longitude: number) {
  return (
    latitude >= 18 &&
    latitude <= 72 &&
    longitude >= -180 &&
    longitude <= -60
  )
}

function isLikelyEurope(latitude: number, longitude: number) {
  return (
    latitude >= 20 &&
    latitude <= 75 &&
    longitude >= -35 &&
    longitude <= 55
  )
}

function geometryContainsPoint(
  geometry: unknown,
  latitude: number,
  longitude: number
) {
  if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) {
    return false
  }

  const bounds = {
    north: -Infinity,
    south: Infinity,
    east: -Infinity,
    west: Infinity
  }

  collectBounds(geometry.coordinates, bounds)

  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  )
}

function collectBounds(coordinates: unknown[], bounds: Bounds) {
  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    const [longitude, latitude] = coordinates

    bounds.north = Math.max(bounds.north, latitude)
    bounds.south = Math.min(bounds.south, latitude)
    bounds.east = Math.max(bounds.east, longitude)
    bounds.west = Math.min(bounds.west, longitude)
    return
  }

  for (const child of coordinates) {
    if (Array.isArray(child)) {
      collectBounds(child, bounds)
    }
  }
}

function normalizeCoordinate(value: number) {
  const rounded = Math.round(value * 1000) / 1000

  return Object.is(rounded, -0) ? 0 : rounded
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
