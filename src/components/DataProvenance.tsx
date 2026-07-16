import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Collapse, IconButton, Tooltip } from '@mui/material'
import { useState } from 'react'
import type { DataProvenance as DataProvenanceValue } from '../types/weather'
import { useI18n } from '../i18n/I18nContext'

type DataProvenanceProps = {
  value: DataProvenanceValue | null | undefined
  compact?: boolean
}

export function DataProvenance({
  value,
  compact = false
}: DataProvenanceProps) {
  const { language, t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  if (!value) {
    return null
  }

  const items = [
    [t('provenance.observed'), formatTime(value.observedAt, language)],
    [t('provenance.refreshed'), formatTime(value.refreshedAt, language)],
    [t('provenance.source'), value.source],
    [t('provenance.resolution'), value.resolution]
  ]

  return (
    <div className="data-provenance-control">
      <Tooltip title={t(expanded ? 'provenance.hide' : 'provenance.show')}>
        <IconButton
          className="data-provenance-toggle"
          size="small"
          aria-label={t(expanded ? 'provenance.hide' : 'provenance.show')}
          aria-expanded={expanded}
          onClick={event => {
            event.stopPropagation()
            setExpanded(current => !current)
          }}
        >
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Collapse in={expanded} unmountOnExit className="data-provenance-details">
        <dl className={`data-provenance ${compact ? 'is-compact' : ''}`}>
          {items.map(([label, content]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{content || '—'}</dd>
            </div>
          ))}
        </dl>
      </Collapse>
    </div>
  )
}

function formatTime(value: string | number | null, language: string) {
  if (value === null) {
    return '—'
  }

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
