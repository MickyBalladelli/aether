import { fetchWithTimeout } from '../shared/fetchTimeout.js'

const FEATURE_SERVER = [
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services',
  'Active_Hurricanes_v1/FeatureServer'
].join('/')
const SOURCE_URL = 'https://www.arcgis.com/home/item.html?id=248e7b5827a34b248647afb012c58787'
const PROVIDER_TIMEOUT_MS = 12000
const FORECAST_POSITION_LAYER = 0
const OBSERVED_POSITION_LAYER = 1
const FORECAST_CONE_LAYER = 4

export async function getTropicalCyclones(hooks = {}) {
  hooks.onProviderRequest?.('Esri Living Atlas / NOAA NHC / JTWC')

  const [forecast, observed, cones] = await Promise.all([
    fetchLayer(FORECAST_POSITION_LAYER),
    fetchLayer(OBSERVED_POSITION_LAYER),
    fetchLayer(FORECAST_CONE_LAYER)
  ])
  const observedGroups = groupFeatures(observed.features)
  const coneGroups = groupFeatures(cones.features)
  const storms = []

  for (const [key, features] of groupFeatures(forecast.features)) {
    const forecastPoints = features
      .map(normalizeForecastPoint)
      .filter(Boolean)
      .sort((first, second) => first.hours - second.hours)
    const current = forecastPoints.find(point => point.hours === 0)

    if (!current) {
      continue
    }

    const observedPoints = (observedGroups.get(key) ?? [])
      .map(normalizeObservedPoint)
      .filter(Boolean)
      .sort((first, second) => Date.parse(first.observedAt) - Date.parse(second.observedAt))
    const baseTime = observedPoints.at(-1)?.observedAt ?? current.advisoryAt
    const cone = (coneGroups.get(key) ?? [])
      .map(feature => normalizeGeometry(feature?.geometry))
      .find(Boolean) ?? null

    storms.push({
      id: stormId(current),
      name: current.name,
      basin: current.basin,
      advisoryAt: current.advisoryAt,
      advisoryNumber: current.advisoryNumber,
      current: stripForecastFields(current, baseTime),
      observedTrack: observedPoints,
      forecast: forecastPoints
        .filter(point => point.hours > 0)
        .map(point => stripForecastFields(point, baseTime)),
      cone
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    cacheState: 'live',
    source: 'NOAA NHC / JTWC via Esri Living Atlas',
    sourceUrl: SOURCE_URL,
    storms: storms.sort((first, second) => (
      Date.parse(second.advisoryAt) - Date.parse(first.advisoryAt)
    ))
  }

  async function fetchLayer(layerId) {
    const url = buildUrl(`${FEATURE_SERVER}/${layerId}/query`, {
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      geometryPrecision: '3',
      maxAllowableOffset: layerId === FORECAST_CONE_LAYER ? '0.025' : '0',
      f: 'geojson'
    })
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/geo+json, application/json',
          'User-Agent': 'Aether Weather Map'
        }
      },
      PROVIDER_TIMEOUT_MS
    )

    hooks.onProviderResponse?.('Esri Living Atlas / NOAA NHC / JTWC', {
      status: response.status,
      rateLimitLimit: readRateLimitHeader(response.headers, 'limit'),
      rateLimitRemaining: readRateLimitHeader(response.headers, 'remaining'),
      retryAfter: response.headers.get('retry-after')
    })

    if (!response.ok) {
      throw Object.assign(
        new Error(`Tropical cyclone feed returned ${response.status}`),
        { status: response.status }
      )
    }

    const payload = await response.json()

    if (!Array.isArray(payload?.features) || payload.error) {
      throw new Error('Tropical cyclone feed returned invalid data')
    }

    return payload
  }
}

function groupFeatures(features) {
  const groups = new Map()

  for (const feature of features) {
    const key = stormKey(feature?.properties)

    if (!key) {
      continue
    }

    const group = groups.get(key) ?? []

    group.push(feature)
    groups.set(key, group)
  }

  return groups
}

function stormKey(properties) {
  const basin = readText(properties?.BASIN)?.toUpperCase()
  const stormNumber = readFiniteNumber(properties?.STORMNUM)
  const name = readText(properties?.STORMNAME)?.toUpperCase()

  if (!basin || stormNumber === null || !name) {
    return null
  }

  return `${basin}:${stormNumber}:${name}`
}

function normalizeForecastPoint(feature) {
  const point = readPoint(feature?.geometry)
  const properties = feature?.properties
  const name = readText(properties?.STORMNAME)
  const basin = readText(properties?.BASIN)?.toUpperCase()
  const stormNumber = readFiniteNumber(properties?.STORMNUM)
  const advisoryAt = readDate(properties?.ADVDATE)
  const hours = readFiniteNumber(properties?.TAU)
  const windKnots = readFiniteNumber(properties?.MAXWIND)

  if (
    !point ||
    !name ||
    !basin ||
    stormNumber === null ||
    !advisoryAt ||
    hours === null ||
    windKnots === null
  ) {
    return null
  }

  return {
    ...point,
    name,
    basin,
    stormNumber,
    advisoryAt,
    advisoryNumber: readText(properties.ADVISNUM),
    hours,
    windKnots,
    gustKnots: readOptionalMeasurement(properties.GUST),
    pressureHpa: readOptionalMeasurement(properties.MSLP),
    category: Math.max(0, readFiniteNumber(properties.SSNUM) ?? 0),
    development: readText(properties.TCDVLP),
    movementDegrees: readOptionalMeasurement(properties.TCDIR),
    movementKnots: readOptionalMeasurement(properties.TCSPD)
  }
}

function normalizeObservedPoint(feature) {
  const point = readPoint(feature?.geometry)
  const observedAt = readDate(feature?.properties?.DTG)
  const windKnots = readFiniteNumber(feature?.properties?.INTENSITY)

  if (!point || !observedAt || windKnots === null) {
    return null
  }

  return {
    ...point,
    observedAt,
    windKnots
  }
}

function stripForecastFields(point, baseTime) {
  const validAt = new Date(
    Date.parse(baseTime) + point.hours * 60 * 60 * 1000
  ).toISOString()

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    validAt,
    hours: point.hours,
    windKnots: point.windKnots,
    gustKnots: point.gustKnots,
    pressureHpa: point.pressureHpa,
    category: point.category,
    development: point.development,
    movementDegrees: point.movementDegrees,
    movementKnots: point.movementKnots
  }
}

function stormId(point) {
  return `${point.basin.toLowerCase()}${String(point.stormNumber).padStart(2, '0')}${new Date(point.advisoryAt).getUTCFullYear()}`
}

function normalizeGeometry(geometry) {
  if (
    !geometry ||
    !['Polygon', 'MultiPolygon'].includes(geometry.type) ||
    !Array.isArray(geometry.coordinates)
  ) {
    return null
  }

  return {
    type: geometry.type,
    coordinates: geometry.coordinates
  }
}

function readPoint(geometry) {
  const coordinates = geometry?.type === 'Point' && Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : null
  const longitude = Number(coordinates?.[0])
  const latitude = Number(coordinates?.[1])

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

  return { latitude, longitude }
}

function readText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readFiniteNumber(value) {
  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function readOptionalMeasurement(value) {
  const number = readFiniteNumber(value)

  return number === null || number < 0 || number >= 9999 ? null : number
}

function readDate(value) {
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value))

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function readRateLimitHeader(headers, name) {
  return headers.get(`ratelimit-${name}`) ??
    headers.get(`x-ratelimit-${name}`)
}

function buildUrl(endpoint, parameters) {
  const url = new URL(endpoint)

  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }

  return url.toString()
}
