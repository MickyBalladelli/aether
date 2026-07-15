import { fetchCoalesced } from './coalescedFetch.js'
import {
  getSharedCache,
  readSharedCache,
  writeSharedCache
} from './sharedCache.js'
import { sendProviderRecord } from './providerResponse.js'
import { getCacheNamespace } from '../shared/cacheVersion.js'

const ARCHIVE_ENDPOINT = 'https://archive-api.open-meteo.com/v1/archive'
const BASELINE_START = '1991-01-01'
const BASELINE_END_YEAR = 2020
const FRESH_TTL = 24 * 60 * 60
const STALE_TTL = 7 * 24 * 60 * 60

export async function handleSoilMoisture(request, response) {
  const latitude = readCoordinate(request.query.latitude, -90, 90)
  const longitude = readCoordinate(request.query.longitude, -180, 180)

  if (latitude === null || longitude === null) {
    response.status(400).json({ error: 'Valid latitude and longitude required' })
    return
  }

  const endDate = getArchiveEndDate()
  const locationKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
  const cacheKey = `${locationKey}:${endDate}`
  const cache = getSharedCache(getCacheNamespace('soil-moisture'))
  const fresh = await readSharedCache(cache, `fresh:${cacheKey}`)

  if (fresh) {
    sendSoilMoisture(response, fresh, 'runtime')
    return
  }

  const stale = await readSharedCache(cache, `stale:${locationKey}`)
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: BASELINE_START,
    end_date: endDate,
    daily: 'soil_moisture_0_to_100cm_mean,soil_moisture_0_to_7cm_mean',
    models: 'era5_land',
    timezone: 'auto'
  })

  try {
    const upstream = await fetchCoalesced(
      `soil-moisture:${cacheKey}`,
      `${ARCHIVE_ENDPOINT}?${params.toString()}`,
      'Aether Weather Map',
      {},
      'soil-moisture',
      20000
    )

    if (!upstream.ok) {
      sendStaleOrError(response, stale, upstream.status)
      return
    }

    const payload = parseSoilMoisture(upstream.body)

    if (!payload) {
      sendStaleOrError(response, stale, 502)
      return
    }

    const record = {
      body: JSON.stringify(payload),
      contentType: 'application/json'
    }

    await Promise.all([
      writeSharedCache(cache, `fresh:${cacheKey}`, record, FRESH_TTL),
      writeSharedCache(cache, `stale:${locationKey}`, record, STALE_TTL)
    ])
    sendSoilMoisture(response, record, 'upstream')
  } catch {
    sendStaleOrError(response, stale, 502)
  }
}

function parseSoilMoisture(body) {
  let payload

  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }

  const dates = payload?.daily?.time
  const roots = payload?.daily?.soil_moisture_0_to_100cm_mean
  const surfaces = payload?.daily?.soil_moisture_0_to_7cm_mean

  if (!Array.isArray(dates) || !Array.isArray(roots) || !Array.isArray(surfaces)) {
    return null
  }

  const latestIndex = findLatestFiniteIndex(roots, surfaces)

  if (latestIndex < 13) return null

  const currentRoot = mean(roots.slice(latestIndex - 13, latestIndex + 1))
  const recentRoot = mean(roots.slice(latestIndex - 6, latestIndex + 1))
  const previousRoot = mean(roots.slice(latestIndex - 13, latestIndex - 6))

  if (currentRoot === null || recentRoot === null || previousRoot === null) return null

  const targetDay = dayOfYear(dates[latestIndex])
  const baseline = []

  for (let index = 13; index < dates.length; index += 1) {
    const year = Number(dates[index].slice(0, 4))

    if (year > BASELINE_END_YEAR || circularDayDistance(dayOfYear(dates[index]), targetDay) > 15) {
      continue
    }

    const value = mean(roots.slice(index - 13, index + 1))

    if (value !== null) baseline.push(value)
  }

  if (baseline.length < 100) return null

  const percentile = Math.round(
    baseline.filter(value => value <= currentRoot).length / baseline.length * 100
  )

  return {
    date: dates[latestIndex],
    rootZonePercent: roundOne(currentRoot * 100),
    surfacePercent: roundOne(surfaces[latestIndex] * 100),
    percentile,
    category: getDroughtCategory(percentile),
    trend: roundOne((recentRoot - previousRoot) * 100),
    model: 'ERA5-Land',
    resolution: '11 km',
    baseline: '1991–2020',
    latitude: payload.latitude,
    longitude: payload.longitude
  }
}

function getDroughtCategory(percentile) {
  if (percentile <= 2) return 'Exceptional drought'
  if (percentile <= 5) return 'Extreme drought'
  if (percentile <= 10) return 'Severe drought'
  if (percentile <= 20) return 'Dry'
  if (percentile <= 30) return 'Dry watch'
  if (percentile >= 80) return 'Wet'
  return 'Near normal'
}

function findLatestFiniteIndex(roots, surfaces) {
  for (let index = Math.min(roots.length, surfaces.length) - 1; index >= 0; index -= 1) {
    if (Number.isFinite(roots[index]) && Number.isFinite(surfaces[index])) return index
  }

  return -1
}

function mean(values) {
  const finite = values.filter(Number.isFinite)

  if (finite.length !== values.length || finite.length === 0) return null
  return finite.reduce((total, value) => total + value, 0) / finite.length
}

function dayOfYear(value) {
  const date = new Date(`${value}T00:00:00Z`)
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)

  return Math.floor((date.getTime() - start) / 86400000) + 1
}

function circularDayDistance(first, second) {
  const distance = Math.abs(first - second)
  return Math.min(distance, 366 - distance)
}

function readCoordinate(value, minimum, maximum) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null
}

function getArchiveEndDate() {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() - 6)
  return date.toISOString().slice(0, 10)
}

function roundOne(value) {
  return Math.round(value * 10) / 10
}

function sendStaleOrError(response, stale, status) {
  if (stale) {
    sendSoilMoisture(response, stale, 'stale')
    return
  }

  response.status(status).json({ error: 'Soil moisture data unavailable' })
}

function sendSoilMoisture(response, record, cacheStatus) {
  sendProviderRecord(response, record, cacheStatus, {
    route: 'soil-moisture',
    maxAge: FRESH_TTL,
    sharedMaxAge: FRESH_TTL
  })
}
