# Monitoring

Vercel logs emit JSON events with `event: "aether.cache"`. Build dashboard sums by `route` for:

- `cacheHitCount`
- `cacheMissCount`
- `staleCount`
- `upstreamRequestCount`

Create alerts for:

- stale responses above 5% for 15 minutes
- provider failures or HTTP 502 responses above 2% for 10 minutes
- HTTP 429 responses above 1% for 10 minutes
- cache hit rate below 50% for 30 minutes
- any `aether.client-render-error` event

Review thresholds after one week of production traffic. Expected traffic and provider behavior should set the final baseline.
