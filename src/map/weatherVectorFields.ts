import { geographicDistanceSquared } from '../services/jetStream'
import type {
  JetStreamSample,
  WeatherMapSample
} from '../types/weather'
import type { ProjectedSample } from './weatherAnimationTypes'

export function windFieldAt(
  x: number,
  y: number,
  samples: ProjectedSample[]
) {
  let vectorX = 0
  let vectorY = 0
  let totalWeight = 0

  for (const projected of samples) {
    const distanceX = projected.x - x
    const distanceY = projected.y - y
    const distanceSquared = distanceX * distanceX + distanceY * distanceY
    const weight = 1 / Math.max(distanceSquared, 64)
    const speed = projected.sample.rawWindSpeed
    const vector = windVector(projected.sample.windAngle)

    vectorX += vector.x * speed * weight
    vectorY += vector.y * speed * weight
    totalWeight += weight
  }

  const eastwardSpeed = vectorX / (totalWeight || 1)
  const southwardSpeed = vectorY / (totalWeight || 1)
  const speed = Math.hypot(eastwardSpeed, southwardSpeed)
  const length = speed || 1

  return {
    x: eastwardSpeed / length,
    y: southwardSpeed / length,
    speed
  }
}

export function jetStreamFieldAt(
  latitude: number,
  longitude: number,
  samples: JetStreamSample[]
) {
  let eastward = 0
  let northward = 0
  let totalWeight = 0

  for (const sample of samples) {
    const distanceSquared = geographicDistanceSquared(
      latitude,
      longitude,
      sample.latitude,
      sample.longitude
    )
    const weight = 1 / (distanceSquared + 90000)

    eastward += sample.eastward * weight
    northward += sample.northward * weight
    totalWeight += weight
  }

  eastward /= totalWeight || 1
  northward /= totalWeight || 1

  const speed = Math.hypot(eastward, northward)
  const length = speed || 1

  return {
    x: eastward / length,
    y: -northward / length,
    speed
  }
}

export function jetStreamBandAt(latitude: number) {
  if (latitude >= 45) {
    return 0
  }

  if (latitude >= 0) {
    return 1
  }

  if (latitude > -45) {
    return 2
  }

  return 3
}

export function precipitationStrength(sample: WeatherMapSample) {
  return Math.min(
    1,
    Math.log1p(sample.precipitation + sample.snowfall * 2) / Math.log(9)
  )
}

function windVector(angle: number) {
  return {
    x: -Math.sin(angle),
    y: Math.cos(angle)
  }
}
