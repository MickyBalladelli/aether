import { getTropicalCyclones } from '../server/tropicalCyclones.js'
import { loadCachedResource } from '../server/cachedResource.js'
import {
  logCacheMetric,
  logProviderFailure,
  logQuotaAlert
} from '../server/cacheMetrics.js'
import { getSharedCache } from '../server/sharedCache.js'
import {
  readProviderQuota,
  setProviderHeaders
} from '../server/providerQuota.js'
import { getCacheNamespace } from '../shared/cacheVersion.js'

const FRESH_CACHE_TTL = 15 * 60
const STALE_CACHE_TTL = 18 * 60 * 60
const METRICS_ROUTE = 'tropical-cyclones'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  let providerFailures = 0
  let quota = null

  try {
    const result = await loadCachedResource({
      cache: getSharedCache(getCacheNamespace('tropical-cyclones')),
      cacheKey: 'global-active',
      freshTtl: FRESH_CACHE_TTL,
      staleTtl: STALE_CACHE_TTL,
      onFreshMiss: () => logCacheMetric(METRICS_ROUTE, 'miss'),
      load: () => getTropicalCyclones({
        onProviderRequest: () => logCacheMetric(METRICS_ROUTE, 'upstream'),
        onProviderResponse: (provider, upstream) => {
          const providerQuota = readProviderQuota(upstream)

          if (providerQuota) {
            quota = providerQuota
            logQuotaAlert(METRICS_ROUTE, provider, providerQuota)
          }
        }
      })
    })
    const payload = {
      ...result.record,
      cacheState: result.source === 'stale' ? 'grace' : 'live'
    }

    if (result.source === 'runtime') {
      logCacheMetric(METRICS_ROUTE, 'hit')
    } else if (result.source === 'stale') {
      logCacheMetric(METRICS_ROUTE, 'stale')
    }

    response.status(200)
    response.setHeader('X-Aether-Cache', result.source)
    setProviderHeaders(response, providerFailures, quota)
    response.setHeader('Cache-Control', 'private, max-age=60')
    response.setHeader(
      'Vercel-CDN-Cache-Control',
      `public, s-maxage=${FRESH_CACHE_TTL}, stale-while-revalidate=3600`
    )
    response.json(payload)
  } catch (error) {
    providerFailures = 1
    logProviderFailure(
      METRICS_ROUTE,
      'Esri Living Atlas / NOAA NHC / JTWC',
      error
    )
    setProviderHeaders(response, providerFailures, quota)
    response.status(502).json({ error: 'Tropical cyclone feed unavailable' })
  }
}
