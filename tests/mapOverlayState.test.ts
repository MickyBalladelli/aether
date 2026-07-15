import { describe, expect, test } from 'vitest'
import {
  loadEnabledMapOverlays,
  saveEnabledMapOverlays
} from '../src/map/mapOverlayState'
import type { MapOverlayId } from '../src/map/mapOverlayState'

describe('map overlay lifecycle', () => {
  test('enables volcano activity by default', () => {
    const storage = new MemoryStorage()

    expect([...loadEnabledMapOverlays(storage)]).toEqual([
      'volcano-activity'
    ])
  })

  test('saves enabled layers and restores only known overlay IDs', () => {
    const storage = new MemoryStorage()
    const layers = createLayers()
    const enabled = new Set([
      layers['heat-detections'],
      layers['reported-wildfires']
    ])

    saveEnabledMapOverlays(
      { hasLayer: layer => enabled.has(layer) },
      layers,
      storage
    )

    expect([...loadEnabledMapOverlays(storage)]).toEqual([
      'heat-detections',
      'reported-wildfires'
    ])

    storage.setItem(
      'aether:map-overlays',
      JSON.stringify(['volcano-activity', 'unknown-layer'])
    )

    expect([...loadEnabledMapOverlays(storage)]).toEqual([
      'volcano-activity'
    ])
  })
})

function createLayers() {
  return {
    'volcano-activity': Symbol('volcano-activity'),
    'heat-detections': Symbol('heat-detections'),
    'reported-wildfires': Symbol('reported-wildfires'),
    'africa-detections': Symbol('africa-detections'),
    'europe-detections': Symbol('europe-detections')
  } satisfies Record<MapOverlayId, symbol>
}

class MemoryStorage {
  private entries = new Map<string, string>()

  getItem(key: string) {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value)
  }
}
