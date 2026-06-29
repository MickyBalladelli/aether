import { logCacheMetric } from './cacheMetrics.js'

export function sendProviderRecord(
  response,
  record,
  cacheStatus,
  { route, maxAge, sharedMaxAge }
) {
  if (cacheStatus === 'runtime') {
    logCacheMetric(route, 'hit')
  } else if (cacheStatus === 'stale') {
    logCacheMetric(route, 'stale')
  }

  response.status(200)
  response.setHeader('Content-Type', record.contentType)
  response.setHeader('Cache-Control', `public, max-age=${maxAge}`)
  response.setHeader(
    'Vercel-CDN-Cache-Control',
    `public, s-maxage=${sharedMaxAge}, stale-while-revalidate=86400`
  )
  response.setHeader('X-Aether-Cache', cacheStatus)
  sendBudgetHeaders(response, record)

  if (cacheStatus === 'stale') {
    response.setHeader('X-Aether-Upstream-Budget', 'low')
  }

  response.send(record.body)
}

export function sendProviderRateLimit(response, retryAfter, providerName) {
  response.status(429)
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Retry-After', String(retryAfter))
  response.setHeader('X-Aether-Upstream-Budget', 'critical')
  response.json({
    error: `${providerName} provider rate limited`,
    retryAfter
  })
}

export function sendBudgetHeaders(response, record) {
  if (record.rateLimitLimit !== null && record.rateLimitLimit !== undefined) {
    response.setHeader('X-Aether-RateLimit-Limit', record.rateLimitLimit)
  }

  if (
    record.rateLimitRemaining !== null &&
    record.rateLimitRemaining !== undefined
  ) {
    response.setHeader(
      'X-Aether-RateLimit-Remaining',
      record.rateLimitRemaining
    )
  }
}

export function getRequestParams(query) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value]

    for (const item of values) {
      if (typeof item === 'string') {
        params.append(key, item)
      }
    }
  }

  return params
}
