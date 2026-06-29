# Aether Improvements

## P0 — Reliability and provider safety

- [x] Move search and reverse geocoding behind a cached server endpoint so rate limits apply across all users and tabs.
- [x] Add explicit timeouts to every upstream weather, air-quality, alert, radar, and geocoding request.
- [x] Validate upstream JSON before storing or rendering it, and reject malformed or incomplete payloads safely.
- [x] Cap and prune in-memory and IndexedDB sample caches by age and entry count.

## P1 — Test and data quality

- [x] Add handler-level tests for weather and air-quality cache hits, stale fallback, backoff, metrics, and malformed provider responses.
- [x] Consolidate duplicated weather mapping, weather-code descriptions, vector interpolation, and cache-status handling.
- [x] Add tests for error-boundary fallbacks, offline startup, service-worker updates, and aborted map selections.
- [x] Type-check unit tests, end-to-end tests, server files, and configuration files in one verification command.

## P2 — Performance and maintainability

- [x] Remove the unused `WeatherCanvas` and `WeatherSimulation` rendering path after confirming no planned consumer needs it.
- [x] Split `App`, `AetherMap`, and `WeatherMapAnimation` into smaller state, data-loading, map-control, and renderer modules.
- [x] Profile canvas redraws during pan and zoom, then avoid rebuilding unchanged textures and particle fields.
- [x] Measure the production bundle and lazy-load heavy map or interface code to remove the current large-chunk warning.

## P3 — Delivery and operations

- [x] Add CI for type checks, unit tests, production build, and Playwright journeys.
- [x] Make Playwright self-contained in CI with a managed preview server, while reusing an existing local server during development.
- [x] Add security headers in `vercel.json`, including CSP, clickjacking protection, referrer policy, and MIME sniffing protection.
- [x] Turn cache metrics and client rendering errors into dashboards or alerts with documented thresholds.
