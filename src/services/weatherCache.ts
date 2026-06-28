import type { WeatherMapSample } from '../types/weather'
import { normalizeLongitude } from '../utils/geo'
import { openStorage } from './storage'

type WeatherCacheRecord = {
  key: string
  updatedAt: number
  sample: WeatherMapSample
}

const STORE_NAME = 'weather-samples'
const MAX_CACHE_AGE = 6 * 60 * 60 * 1000

export async function loadPersistedWeatherSamples() {
  const database = await openStorage()

  if (!database) {
    return []
  }

  return new Promise<WeatherMapSample[]>(resolve => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()

    request.onsuccess = () => {
      const now = Date.now()
      const records = (request.result as WeatherCacheRecord[])
        .filter(record => now - record.updatedAt <= MAX_CACHE_AGE)
        .map(record => ({
          ...record.sample,
          updatedAt: record.updatedAt
        }))

      resolve(records)
    }
    request.onerror = () => resolve([])
  })
}

export async function persistWeatherSamples(samples: WeatherMapSample[]) {
  const database = await openStorage()

  if (!database || samples.length === 0) {
    return
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    for (const sample of samples) {
      const updatedAt = sample.updatedAt ?? Date.now()

      store.put({
        key: getWeatherCacheKey(sample.latitude, sample.longitude),
        updatedAt,
        sample: {
          ...sample,
          updatedAt
        }
      } satisfies WeatherCacheRecord)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}

export function getWeatherCacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)}:${normalizeLongitude(longitude).toFixed(3)}`
}