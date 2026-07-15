import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import VideocamIcon from '@mui/icons-material/Videocam'
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { fetchNearbyWebcams } from '../services/webcams'
import type { NearbyWebcam, NearbyWebcams, WeatherLocation } from '../types/weather'
import { usePageVisibility } from '../hooks/usePageVisibility'

export function NearbyWebcams({ location }: { location: WeatherLocation | null }) {
  const [expanded, setExpanded] = useState(false)
  const [result, setResult] = useState<NearbyWebcams | null>(null)
  const [selected, setSelected] = useState<NearbyWebcam | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const pageVisible = usePageVisibility()
  const { t } = useI18n()

  useEffect(() => {
    setExpanded(false)
    setResult(null)
    setSelected(null)
    setUnavailable(false)
  }, [location])

  useEffect(() => {
    if (!pageVisible || !expanded || !location || result || unavailable) return

    const controller = new AbortController()

    setLoading(true)
    void fetchNearbyWebcams(location, controller.signal)
      .then(setResult)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setUnavailable(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [expanded, location, pageVisible, result, unavailable])

  if (!location) return null

  return (
    <Box className={`nearby-webcams ${expanded ? 'is-expanded' : ''}`}>
      <button
        className="nearby-webcams-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(current => !current)}
      >
        <VideocamIcon />
        <span>
          <strong>{t('webcam.liveWebcams')}</strong>
          <small>{t('webcam.checkWeather')}</small>
        </span>
        <ExpandMoreIcon className="nearby-webcams-expand" />
      </button>

      {expanded && (
        <Box className="nearby-webcams-content">
          {loading && <Typography variant="caption">{t('webcam.finding')}</Typography>}
          {unavailable && <Typography variant="caption">{t('webcam.unavailable')}</Typography>}
          {result?.configured === false && (
            <Typography variant="caption">
              {t('webcam.configure')}
            </Typography>
          )}
          {result?.configured && result.webcams.length === 0 && (
            <Typography variant="caption">
              {t('webcam.noneNearby', { distance: result.radiusKm })}
            </Typography>
          )}
          {result?.webcams.map(webcam => (
            <button
              className="nearby-webcam-item"
              key={webcam.id}
              onClick={() => setSelected(webcam)}
            >
              <VideocamIcon />
              <span>
                <strong>{webcam.title}</strong>
                <small>{webcam.city} · {webcam.distanceKm} km</small>
              </span>
              <span className="nearby-webcam-live">
                {webcam.live ? t('webcam.live') : t('webcam.today')}
              </span>
            </button>
          ))}
          {result?.configured && <WindyAttribution />}
        </Box>
      )}

      <WebcamDialog webcam={selected} onClose={() => setSelected(null)} />
    </Box>
  )
}

function WebcamDialog({
  webcam,
  onClose
}: {
  webcam: NearbyWebcam | null
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <Dialog
      open={Boolean(webcam)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { className: 'webcam-dialog-paper' } }}
    >
      {webcam && (
        <>
          <DialogTitle className="webcam-dialog-title">
            <Box>
              <Typography component="h2">{webcam.title}</Typography>
              <Typography variant="caption">
                {t('webcam.distanceAway', {
                  city: webcam.city,
                  distance: webcam.distanceKm
                })}
              </Typography>
            </Box>
            <IconButton aria-label={t('webcam.close')} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className="webcam-dialog-content">
            <iframe
              className="webcam-player"
              src={webcam.playerUrl}
              title={t('webcam.playerTitle', { title: webcam.title })}
              allow="autoplay; fullscreen"
              referrerPolicy="no-referrer"
            />
            <Box className="webcam-dialog-footer">
              <WindyAttribution />
              <Link href={webcam.detailUrl} target="_blank" rel="noreferrer">
                {t('webcam.openWindy')} <OpenInNewIcon />
              </Link>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}

function WindyAttribution() {
  const { t } = useI18n()

  return (
    <Typography variant="caption" className="windy-attribution">
      {t('webcam.providedBy')}{' '}
      <Link href="https://www.windy.com/" target="_blank" rel="noreferrer">
        windy.com
      </Link>
      {' · '}
      <Link href="https://www.windy.com/webcams/add" target="_blank" rel="noreferrer">
        {t('webcam.add')}
      </Link>
    </Typography>
  )
}
