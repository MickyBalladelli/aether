export const CITY_FOCUS_ZOOM = 12
export const MAX_MAP_ZOOM = 16

type CityFocusState = {
  latitudeDelta: number
  longitudeDelta: number
  currentZoom: number
  focusRequested: boolean
}

export function needsCityFocus({
  latitudeDelta,
  longitudeDelta,
  currentZoom,
  focusRequested
}: CityFocusState) {
  return (
    focusRequested ||
    latitudeDelta >= 0.1 ||
    longitudeDelta >= 0.1 ||
    currentZoom < CITY_FOCUS_ZOOM
  )
}
