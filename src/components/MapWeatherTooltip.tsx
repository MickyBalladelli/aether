import AirIcon from '@mui/icons-material/Air'
import BlurOnIcon from '@mui/icons-material/BlurOn'
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat'
import FlightIcon from '@mui/icons-material/Flight'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import RadarIcon from '@mui/icons-material/Radar'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import WavesIcon from '@mui/icons-material/Waves'
import type { MapWeatherPointer } from '../types/weather'

type MapWeatherTooltipProps = {
  reading: MapWeatherPointer | null
}

export function MapWeatherTooltip({ reading }: MapWeatherTooltipProps) {
  if (!reading) {
    return null
  }

  return (
    <aside
      className="map-weather-tooltip"
      style={{
        left: reading.screenX,
        top: reading.screenY
      }}
      aria-live="polite"
    >
      {reading.placeLabel && (
        <div className="map-weather-tooltip-place">
          <LocationOnIcon />
          <strong>{reading.placeLabel}</strong>
        </div>
      )}

      <span className="map-weather-tooltip-coordinates">
        {reading.latitude.toFixed(3)}, {reading.longitude.toFixed(3)}
      </span>

      <div className="map-weather-tooltip-row">
        <DeviceThermostatIcon />
        <span>{Math.round(reading.temperature)}°C</span>
      </div>

      {reading.oceanCurrentSpeed !== undefined && reading.oceanCurrentAngle !== undefined && (
        <div className="map-weather-tooltip-ocean">
          <div className="map-weather-tooltip-row">
            <WavesIcon />
            <span>
              Current {reading.oceanCurrentSpeed.toFixed(2)} m/s {formatWindDirection(reading.oceanCurrentAngle)}
            </span>
          </div>
          {reading.seaSurfaceTemperature !== undefined && (
            <span>
              Sea {reading.seaSurfaceTemperature.toFixed(1)}°C
              {reading.seaSurfaceTemperatureAnomaly !== undefined && (
                ` · ${formatAnomaly(reading.seaSurfaceTemperatureAnomaly)} anomaly`
              )}
            </span>
          )}
        </div>
      )}

      {reading.jetStreamSpeed !== undefined && reading.jetStreamAngle !== undefined && (
        <div className="map-weather-tooltip-row">
          <FlightIcon />
          <span>
            Jet {Math.round(reading.jetStreamSpeed)} km/h {formatWindDirection(reading.jetStreamAngle)}
          </span>
        </div>
      )}

      <div className="map-weather-tooltip-row">
        <AirIcon />
        <span>
          {Math.round(reading.rawWindSpeed)} km/h {formatWindDirection(reading.windAngle)}
        </span>
      </div>

      <div className="map-weather-tooltip-row">
        <WaterDropIcon />
        <span>{reading.precipitation.toFixed(1)} mm</span>
      </div>

      {reading.radarRain && (
        <div className={`map-weather-tooltip-radar is-${reading.radarRain.status}`}>
          <div className="map-weather-tooltip-row">
            <RadarIcon />
            <strong>{formatRadarRain(reading.radarRain)}</strong>
          </div>
          {reading.radarRain.observedAt && (
            <span>
              Latest radar · {formatRadarAge(reading.radarRain.observedAt)}
            </span>
          )}
        </div>
      )}

      {reading.europeanAqi !== undefined && (
        <div className="map-weather-tooltip-row">
          <BlurOnIcon />
          <span>
            AQI {Math.round(reading.europeanAqi)} · PM2.5 {reading.pm2_5?.toFixed(1)} µg/m³
          </span>
        </div>
      )}

      {reading.fire && (
        <div className="map-weather-tooltip-fire">
          <div className="map-weather-tooltip-row">
            <LocalFireDepartmentIcon />
            <strong>{reading.fire.title}</strong>
          </div>
          <span>{reading.fire.source}</span>
          <span>{reading.fire.detail}</span>
        </div>
      )}
    </aside>
  )
}

function formatWindDirection(angle: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const degrees = angle * 180 / Math.PI
  const index = Math.round(degrees / 45) % directions.length

  return directions[index]
}

function formatAnomaly(anomaly: number) {
  return `${anomaly >= 0 ? '+' : ''}${anomaly.toFixed(1)}°C`
}

function formatRadarRain(reading: NonNullable<MapWeatherPointer['radarRain']>) {
  if (reading.status === 'checking') {
    return 'Checking local radar…'
  }

  if (reading.status === 'rain') {
    return 'Radar detects rain here'
  }

  if (reading.status === 'dry') {
    return 'No rain detected here'
  }

  if (reading.status === 'no-coverage') {
    return 'No radar coverage here'
  }

  return 'Radar unavailable here'
}

function formatRadarAge(observedAt: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - Date.parse(observedAt)) / 60000)
  )

  return minutes < 1 ? 'just now' : `${minutes} min ago`
}
