export function isWeatherResponse(value: unknown): boolean
export function isJetStreamResponse(value: unknown): boolean
export function isAirQualityResponse(value: unknown): boolean
export function parseProviderBody(
  body: string,
  validate: (value: unknown) => boolean
): unknown | null
