import type { FireLayerId } from './fireLayerStatus'

const MAP_OVERLAYS_KEY = 'aether:map-overlays:v3'
const LEGACY_MAP_OVERLAYS_KEY = 'aether:map-overlays:v2'

export type MapOverlayId = FireLayerId |
  'tropical-cyclones' |
  'volcano-activity' |
  'seismic-activity'

export const MAP_OVERLAY_IDS: MapOverlayId[] = [
  'tropical-cyclones',
  'volcano-activity',
  'seismic-activity',
  'heat-detections',
  'reported-wildfires',
  'africa-detections',
  'europe-detections'
]

type OverlayStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadEnabledMapOverlays(
  storage: OverlayStorage = window.localStorage
) {
  try {
    const value = storage.getItem(MAP_OVERLAYS_KEY)

    if (value === null) {
      const legacyValue = storage.getItem(LEGACY_MAP_OVERLAYS_KEY)

      if (legacyValue === null) {
        return defaultOverlays()
      }

      return new Set<MapOverlayId>([
        'tropical-cyclones',
        ...readOverlayIds(legacyValue)
      ])
    }

    return new Set(readOverlayIds(value))
  } catch {
    return defaultOverlays()
  }
}

function defaultOverlays() {
  return new Set<MapOverlayId>([
    'tropical-cyclones',
    'volcano-activity',
    'seismic-activity'
  ])
}

function readOverlayIds(value: string) {
  const parsed: unknown = JSON.parse(value)

  if (!Array.isArray(parsed)) {
    return []
  }

  return MAP_OVERLAY_IDS.filter(layerId => parsed.includes(layerId))
}

export function saveEnabledMapOverlays<Layer>(
  map: { hasLayer: (layer: Layer) => boolean },
  layers: Record<MapOverlayId, Layer>,
  storage: OverlayStorage = window.localStorage
) {
  try {
    const enabled = MAP_OVERLAY_IDS.filter(layerId => (
      map.hasLayer(layers[layerId])
    ))

    storage.setItem(MAP_OVERLAYS_KEY, JSON.stringify(enabled))
  } catch {
    return
  }
}
