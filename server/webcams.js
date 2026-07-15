import { fetchCoalesced } from './coalescedFetch.js'
import {
  getSharedCache,
  readSharedCache,
  writeSharedCache
} from './sharedCache.js'
import { sendProviderRecord } from './providerResponse.js'
import { getCacheNamespace } from '../shared/cacheVersion.js'

const WEBCAMS_ENDPOINT = 'https://api.windy.com/webcams/api/v3/webcams'
const RADIUS_KM = 100
const CACHE_TTL = 4 * 60

export async function handleWebcams(request, response) {
  const apiKey = process.env.WINDY_KEY

  if (!apiKey) {
    response.setHeader('Cache-Control', 'no-store')
    response.status(503).json({
      configured: false,
      error: 'Webcam provider key missing'
    })
    return
  }

  const latitude = readCoordinate(request.query.latitude, -90, 90)
  const longitude = readCoordinate(request.query.longitude, -180, 180)

  if (latitude === null || longitude === null) {
    response.status(400).json({ error: 'Valid latitude and longitude required' })
    return
  }

  const locationKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
  const cache = getSharedCache(getCacheNamespace('webcams'))
  const cached = await readSharedCache(cache, locationKey)

  if (cached) {
    sendWebcams(response, cached, 'runtime')
    return
  }

  const url = new URL(WEBCAMS_ENDPOINT)

  url.searchParams.set('nearby', `${latitude},${longitude},${RADIUS_KM}`)
  url.searchParams.set('limit', '12')
  url.searchParams.set('include', 'location,player,urls,categories')
  url.searchParams.set('sortKey', 'popularity')
  url.searchParams.set('sortDirection', 'desc')
  url.searchParams.set('lang', 'en')

  try {
    const upstream = await fetchCoalesced(
      `webcams:${locationKey}`,
      url.toString(),
      'Aether Weather Map',
      { 'x-windy-api-key': apiKey },
      'webcams'
    )

    if (!upstream.ok) {
      response.setHeader('Cache-Control', 'no-store')
      response.status(upstream.status).json({ error: 'Webcam provider unavailable' })
      return
    }

    const payload = normalizeWebcams(upstream.body, latitude, longitude)

    if (!payload) {
      response.status(502).json({ error: 'Invalid webcam provider response' })
      return
    }

    const record = {
      body: JSON.stringify(payload),
      contentType: 'application/json'
    }

    await writeSharedCache(cache, locationKey, record, CACHE_TTL)
    sendWebcams(response, record, 'upstream')
  } catch {
    response.status(502).json({ error: 'Webcam provider unavailable' })
  }
}

function normalizeWebcams(body, latitude, longitude) {
  let payload

  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }

  if (!Array.isArray(payload?.webcams)) return null

  const webcams = payload.webcams
    .filter(webcam => webcam?.status === 'active')
    .map(webcam => {
      const cameraLatitude = webcam?.location?.latitude
      const cameraLongitude = webcam?.location?.longitude
      const playerUrl = safeWindyUrl(webcam?.player?.live) ??
        safeWindyUrl(webcam?.player?.day)
      const detailUrl = safeWindyUrl(webcam?.urls?.detail)

      if (
        !Number.isFinite(cameraLatitude) ||
        !Number.isFinite(cameraLongitude) ||
        !playerUrl ||
        !detailUrl ||
        !Number.isFinite(webcam.webcamId) ||
        typeof webcam.title !== 'string'
      ) {
        return null
      }

      return {
        id: webcam.webcamId,
        title: webcam.title,
        city: webcam.location.city || webcam.location.region || 'Nearby camera',
        distanceKm: Math.round(distanceKm(
          latitude,
          longitude,
          cameraLatitude,
          cameraLongitude
        )),
        playerUrl,
        detailUrl,
        live: Boolean(webcam?.player?.live),
        updatedAt: webcam.lastUpdatedOn
      }
    })
    .filter(Boolean)
    .sort((first, second) => first.distanceKm - second.distanceKm)
    .slice(0, 4)

  return {
    configured: true,
    radiusKm: RADIUS_KM,
    total: Number.isFinite(payload.total) ? payload.total : webcams.length,
    webcams
  }
}

function safeWindyUrl(value) {
  if (typeof value !== 'string') return null

  try {
    const url = new URL(value)

    return url.protocol === 'https:' && (
      url.hostname === 'windy.com' || url.hostname.endsWith('.windy.com')
    ) ? url.toString() : null
  } catch {
    return null
  }
}

function distanceKm(firstLatitude, firstLongitude, secondLatitude, secondLongitude) {
  const radians = Math.PI / 180
  const latitudeDelta = (secondLatitude - firstLatitude) * radians
  const longitudeDelta = (secondLongitude - firstLongitude) * radians
  const first = firstLatitude * radians
  const second = secondLatitude * radians
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(first) * Math.cos(second) * Math.sin(longitudeDelta / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function readCoordinate(value, minimum, maximum) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null
}

function sendWebcams(response, record, cacheStatus) {
  sendProviderRecord(response, record, cacheStatus, {
    route: 'webcams',
    maxAge: CACHE_TTL,
    sharedMaxAge: CACHE_TTL
  })
}
