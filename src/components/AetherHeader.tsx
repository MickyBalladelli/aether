import SearchIcon from '@mui/icons-material/Search'
import { Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  AnimationQuality,
  WeatherDataState,
  WeatherLocation
} from '../types/weather'
import { useI18n } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/translations'
import { AboutDialog } from './AboutDialog'
import { LocationBookmarks } from './LocationBookmarks'
import { SetupDialog } from './SetupDialog'
import { WeatherRetryButton } from './WeatherRetryButton'

type AetherHeaderProps = {
  location: WeatherLocation
  status: string
  dataState: WeatherDataState
  animationQuality: AnimationQuality
  onSearch: (query: string) => void
  onLocationSelect: (location: WeatherLocation) => void
  onAnimationQualityChange: (quality: AnimationQuality) => void
  onWeatherRetry: () => void
}

export function AetherHeader({
  location,
  status,
  dataState,
  animationQuality,
  onSearch,
  onLocationSelect,
  onAnimationQualityChange,
  onWeatherRetry
}: AetherHeaderProps) {
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(Date.now)
  const { t } = useI18n()

  useEffect(() => {
    if (dataState.lastSuccessAt === null && dataState.staleAgeMs === null) {
      return
    }

    const interval = window.setInterval(() => setNow(Date.now()), 60_000)

    return () => window.clearInterval(interval)
  }, [dataState.lastSuccessAt, dataState.staleAgeMs === null])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(query)
  }

  const stateStatus = dataState.status
  const statusLabel = formatStatusLabel(status, dataState, now, t)
  const lastSuccessAge = dataState.lastSuccessAt === null
    ? t('common.unavailable')
    : formatAge(now - dataState.lastSuccessAt, t)
  const staleAge = dataState.staleAgeMs === null
    ? t('common.unavailable')
    : formatAge(dataState.staleAgeMs, t)

const dataStateTooltip = (
  <dl className="data-state-legend">
    <dt>{t('data.live')}</dt>
    <dd>{t('data.liveDetail')}</dd>
    <dt>{t('data.cached')}</dt>
    <dd>{t('data.cachedDetail')}</dd>
    <dt>{t('data.stale')}</dt>
    <dd>{t('data.staleDetail')}</dd>
    <dt>{t('data.unavailable')}</dt>
    <dd>{t('data.unavailableDetail')}</dd>
    <dt>{t('data.lastSuccess')}</dt>
    <dd>{lastSuccessAge}</dd>
    <dt>{t('data.staleAge')}</dt>
    <dd>{staleAge}</dd>
  </dl>
) as unknown as React.ReactNode

  return (
    <Box component="header" className="aether-header" aria-label={t('header.controls')}>
      <Stack direction="row" alignItems="center" gap={1.25} className="brand-block">
        <Box className="brand-mark">
          <img src="/aether.svg" alt="" className="brand-logo" />
        </Box>
        <Box className="brand-copy">
          <Typography variant="subtitle2" className="brand-name">
            Aether
          </Typography>
          <Typography variant="caption" className="brand-version">
            {import.meta.env.VITE_AETHER_BUILD_VERSION}
          </Typography>
        </Box>
        <span className="brand-divider" />
        <Typography variant="h6" className="brand-place">
          {location.label}
        </Typography>
      </Stack>

      <Box className="header-actions">
        <LocationBookmarks
          location={location}
          onSelect={onLocationSelect}
        />
        <Box
          component="form"
          className="map-search"
          aria-label={t('header.locationSearch')}
          onSubmit={handleSubmit}
        >
          <TextField
            size="small"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('header.searchCity')}
            inputProps={{ 'aria-label': t('header.searchCity') }}
            className="city-search-input"
          />
          <IconButton type="submit" aria-label={t('header.search')} className="city-search-button">
            <SearchIcon fontSize="small" />
          </IconButton>
          <Box className="weather-status-group">
            <Tooltip
              title={dataStateTooltip}
              componentsProps={{ tooltip: { className: 'data-state-tooltip' } }}
              enterDelay={200}
              leaveDelay={200}
            >
              <Typography
                variant="caption"
                role="status"
                className={`search-status search-status-${stateStatus}`}
              >
                {statusLabel}
              </Typography>
            </Tooltip>
            <WeatherRetryButton
              visible={stateStatus === 'stale' || stateStatus === 'unavailable'}
              onRetry={onWeatherRetry}
            />
          </Box>
        </Box>
        <SetupDialog
          animationQuality={animationQuality}
          onAnimationQualityChange={onAnimationQualityChange}
        />
        <AboutDialog />
      </Box>
    </Box>
  )
}

type Translator = ReturnType<typeof useI18n>['t']

function formatStatusLabel(
  status: string,
  dataState: WeatherDataState,
  now: number,
  t: Translator
) {
  const label = translateStatus(status, t)

  if (
    (dataState.status === 'cached' || dataState.status === 'stale') &&
    dataState.staleAgeMs !== null
  ) {
    return `${label} · ${formatAge(dataState.staleAgeMs, t)}`
  }

  if (dataState.status === 'unavailable' && dataState.lastSuccessAt !== null) {
    return `${label} · ${t('data.lastSuccess')} ${formatAge(
      now - dataState.lastSuccessAt,
      t
    )}`
  }

  return label
}

function formatAge(ageMs: number, t: Translator) {
  const safeAge = Math.max(0, ageMs)
  const minutes = Math.floor(safeAge / 60_000)

  if (minutes < 1) {
    return t('data.ageNow')
  }

  if (minutes < 60) {
    return t('data.ageMinutes', { count: minutes })
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return t('data.ageHours', { count: hours })
  }

  return t('data.ageDays', { count: Math.floor(hours / 24) })
}

function translateStatus(
  status: string,
  t: Translator
) {
  const statusKeys: Record<string, TranslationKey> = {
    'Reading sky': 'status.readingSky',
    Locating: 'status.locating',
    'Searching city': 'status.searchingCity',
    Live: 'data.live',
    Cached: 'data.cached',
    Stale: 'data.stale',
    Unavailable: 'data.unavailable',
    'City search failed': 'status.cityFailed',
    'Map weather failed': 'status.mapFailed',
    'Ocean currents failed': 'status.oceanFailed'
  }

  if (statusKeys[status]) return t(statusKeys[status])
  if (/city|geocod/i.test(status)) return t('status.cityFailed')
  if (/ocean/i.test(status)) return t('status.oceanFailed')
  if (/map|weather/i.test(status)) return t('status.mapFailed')
  return status
}
