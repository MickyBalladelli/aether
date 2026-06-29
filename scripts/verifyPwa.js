import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(
  await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8')
)
const serviceWorker = await readFile(
  new URL('../dist/sw.js', import.meta.url),
  'utf8'
)

if (
  manifest.display !== 'standalone' ||
  !manifest.icons?.some(icon => icon.sizes === '512x512')
) {
  throw new Error('PWA manifest is incomplete')
}

if (
  !serviceWorker.includes('index.html') ||
  !serviceWorker.includes('aether-api-') ||
  !serviceWorker.includes('skipWaiting')
) {
  throw new Error('PWA service worker lacks offline shell, updates, or API caching')
}

console.log('PWA manifest and service worker verified')
