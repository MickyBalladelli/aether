import { describe, expect, test } from 'vitest'
import english from '../../src/i18n/catalogs/en.json'
import french from '../../src/i18n/catalogs/fr.json'
import italian from '../../src/i18n/catalogs/it.json'
import {
  CITY_FOCUS_ZOOM,
  MAX_MAP_ZOOM,
  needsCityFocus
} from '../../src/map/mapZoomPolicy'

describe('map navigation regressions', () => {
  test('keeps city focus readable while allowing closer manual zoom', () => {
    expect(CITY_FOCUS_ZOOM).toBe(12)
    expect(MAX_MAP_ZOOM).toBe(16)
    expect(MAX_MAP_ZOOM).toBeGreaterThan(CITY_FOCUS_ZOOM)
  })

  test('focuses searches, bookmarks, distant cities, and zoomed-out cities', () => {
    expect(needsCityFocus(state({ focusRequested: true }))).toBe(true)
    expect(needsCityFocus(state({ latitudeDelta: 5 }))).toBe(true)
    expect(needsCityFocus(state({ currentZoom: 8 }))).toBe(true)
    expect(needsCityFocus(state())).toBe(false)
  })
})

describe('translation catalog regressions', () => {
  test('keeps locale keys and interpolation placeholders aligned', () => {
    const catalogs = { fr: french, it: italian }
    const englishKeys = Object.keys(english).sort()

    for (const [locale, catalog] of Object.entries(catalogs)) {
      expect(Object.keys(catalog).sort(), `${locale} keys`).toEqual(englishKeys)

      for (const key of englishKeys) {
        expect(
          placeholders(catalog[key as keyof typeof catalog]),
          `${locale}:${key} placeholders`
        ).toEqual(placeholders(english[key as keyof typeof english]))
      }
    }
  })
})

function state(overrides: Partial<Parameters<typeof needsCityFocus>[0]> = {}) {
  return {
    latitudeDelta: 0,
    longitudeDelta: 0,
    currentZoom: CITY_FOCUS_ZOOM,
    focusRequested: false,
    ...overrides
  }
}

function placeholders(message: string) {
  return [...message.matchAll(/\{\{(\w+)\}\}/g)]
    .map(match => match[1])
    .sort()
}
