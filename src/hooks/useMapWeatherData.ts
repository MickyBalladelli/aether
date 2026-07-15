import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  AIR_QUALITY_REFRESH_INTERVAL,
  fetchAirQualityMapSamples,
  getCachedAirQualityMapSamples
} from '../services/airQuality'
import {
  JET_STREAM_REFRESH_INTERVAL,
  fetchJetStreamSamples
} from '../services/jetStream'
import {
  OCEAN_CURRENT_REFRESH_INTERVAL,
  fetchOceanCurrentData
} from '../services/oceanCurrents'
import {
  WEATHER_REFRESH_INTERVAL,
  fetchWeatherMapSamples,
  getCachedWeatherMapSamples,
  hydrateWeatherMapCache
} from '../services/weatherGrid'
import type {
  AirQualityMapSample,
  JetStreamSample,
  OceanCurrentData,
  WeatherLocation,
  WeatherMapSample,
  WeatherMode,
  WeatherViewport
} from '../types/weather'

type MapWeatherDataOptions = {
  viewport: WeatherViewport | null
  mode: WeatherMode
  location: WeatherLocation
  forecastReady: boolean
  setStatus: Dispatch<SetStateAction<string>>
}

export function useMapWeatherData({
  viewport,
  mode,
  location,
  forecastReady,
  setStatus
}: MapWeatherDataOptions) {
  const previousJetStreamViewportRef = useRef<WeatherViewport | null>(null)
  const jetStreamViewportRef = useRef<WeatherViewport | null>(null)
  const jetStreamLocationRef = useRef('')
  const [mapSamples, setMapSamples] = useState<WeatherMapSample[]>([])
  const [jetStreamSamples, setJetStreamSamples] = useState<JetStreamSample[]>([])
  const [airQualitySamples, setAirQualitySamples] = useState<AirQualityMapSample[]>([])
  const [oceanCurrentData, setOceanCurrentData] = useState<OceanCurrentData | null>(null)

  useEffect(() => {
    if (!viewport || mode === 'jet-stream') {
      return
    }

    let cancelled = false
    let loading = false
    const cachedSamples = getCachedWeatherMapSamples(viewport)

    if (cachedSamples.length > 0) {
      setMapSamples(cachedSamples)
    }

    const applyPersistentCache = async () => {
      const samples = await hydrateWeatherMapCache(viewport)

      if (!cancelled && samples.length > 0) {
        setMapSamples(current => current.length > 0 ? current : samples)
      }
    }

    void applyPersistentCache()

    if (!forecastReady) {
      return () => {
        cancelled = true
      }
    }

    const controller = new AbortController()
    const refreshVisibleWeather = async () => {
      if (loading) {
        return
      }

      loading = true

      try {
        const samples = await fetchWeatherMapSamples(viewport, controller.signal)

        if (!cancelled && samples.length > 0) {
          setMapSamples(samples)
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : 'Map weather failed')
        }
      } finally {
        loading = false
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshVisibleWeather()
      }
    }
    const timeout = window.setTimeout(refreshVisibleWeather, 120)
    const interval = window.setInterval(
      refreshVisibleWeather,
      WEATHER_REFRESH_INTERVAL
    )

    window.addEventListener('online', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
      window.clearInterval(interval)
      window.removeEventListener('online', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [forecastReady, mode, setStatus, viewport])

  useEffect(() => {
    if (!viewport || mode !== 'jet-stream') {
      previousJetStreamViewportRef.current = null
      jetStreamViewportRef.current = null
      return
    }

    const locationKey = `${location.latitude}:${location.longitude}`
    const locationChanged = jetStreamLocationRef.current !== locationKey
    const previousViewport = previousJetStreamViewportRef.current
    const zoomChanged = previousViewport !== null &&
      previousViewport.zoom !== viewport.zoom

    previousJetStreamViewportRef.current = viewport
    jetStreamLocationRef.current = locationKey

    if (locationChanged || !jetStreamViewportRef.current || !zoomChanged) {
      jetStreamViewportRef.current = viewport
    }

    const samplingViewport = jetStreamViewportRef.current
    const controller = new AbortController()
    let cancelled = false
    let loading = false

    const refreshJetStream = async () => {
      if (loading) {
        return
      }

      loading = true

      try {
        const samples = await fetchJetStreamSamples(
          samplingViewport,
          controller.signal
        )

        if (!cancelled && samples.length > 0) {
          setJetStreamSamples(samples)
        }
      } finally {
        loading = false
      }
    }
    const timeout = window.setTimeout(refreshJetStream, 120)
    const interval = window.setInterval(
      refreshJetStream,
      JET_STREAM_REFRESH_INTERVAL
    )

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [location, mode, viewport])

  useEffect(() => {
    if (!viewport) {
      return
    }

    let cancelled = false
    let loading = false

    setAirQualitySamples(getCachedAirQualityMapSamples(viewport))

    const refreshAirQuality = async () => {
      if (loading) {
        return
      }

      loading = true

      try {
        const samples = await fetchAirQualityMapSamples(viewport)

        if (!cancelled) {
          setAirQualitySamples(samples)
        }
      } finally {
        loading = false
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshAirQuality()
      }
    }
    const timeout = window.setTimeout(refreshAirQuality, 180)
    const interval = window.setInterval(
      refreshAirQuality,
      AIR_QUALITY_REFRESH_INTERVAL
    )

    window.addEventListener('online', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.clearInterval(interval)
      window.removeEventListener('online', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [viewport])

  useEffect(() => {
    if (!viewport || mode !== 'ocean-current') {
      return
    }

    const controller = new AbortController()
    let cancelled = false
    let loading = false

    const refreshOceanCurrents = async () => {
      if (loading) {
        return
      }

      loading = true

      try {
        const data = await fetchOceanCurrentData(viewport, controller.signal)

        if (!cancelled) {
          setOceanCurrentData(data)
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : 'Ocean currents failed')
        }
      } finally {
        loading = false
      }
    }
    const timeout = window.setTimeout(refreshOceanCurrents, 120)
    const interval = window.setInterval(
      refreshOceanCurrents,
      OCEAN_CURRENT_REFRESH_INTERVAL
    )

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [mode, setStatus, viewport])

  return {
    mapSamples,
    jetStreamSamples,
    airQualitySamples,
    oceanCurrentData
  }
}
