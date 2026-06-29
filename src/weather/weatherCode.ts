export const THUNDERSTORM_CODES = new Set([95, 96, 99])

export function describeWeatherCode(code: number) {
  if (THUNDERSTORM_CODES.has(code)) {
    return 'Thunderstorm'
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'Snow'
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return 'Rain'
  }

  if ([45, 48].includes(code)) {
    return 'Fog'
  }

  if ([1, 2, 3].includes(code)) {
    return 'Cloud drift'
  }

  return 'Clear air'
}
