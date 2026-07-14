import type { FireLayerStatus as FireLayerStatusValue } from '../map/fireLayerStatus'

type FireLayerStatusProps = {
  statuses: FireLayerStatusValue[]
}

const STATE_LABELS: Record<FireLayerStatusValue['state'], string> = {
  idle: 'Off',
  loading: 'Loading…',
  available: 'Ready',
  unavailable: 'Unavailable',
  'missing-key': 'NASA key missing'
}

export function FireLayerStatus({ statuses }: FireLayerStatusProps) {
  const enabledStatuses = statuses.filter(status => status.enabled)
  const effisStatuses = enabledStatuses.filter(status => (
    status.id === 'europe-detections' || status.id === 'africa-detections'
  ))
  const effisStatus = effisStatuses.find(status => status.lastUpdated) ??
    effisStatuses[0]

  if (enabledStatuses.length === 0) {
    return null
  }

  return (
    <aside
      className="fire-layer-status"
      aria-label="Fire layer status"
      aria-live="polite"
    >
      {enabledStatuses.map(status => (
        <div className="fire-layer-status-row" key={status.id}>
          <span className="fire-layer-status-name">{status.label}</span>
          <span
            className={`fire-layer-status-state is-${status.state}`}
          >
            {STATE_LABELS[status.state]}
          </span>
          {(status.lastUpdated || typeof status.itemCount === 'number') && (
            <span className="fire-layer-status-detail">
              {typeof status.itemCount === 'number'
                ? `${status.itemCount.toLocaleString()} reports · `
                : ''}
              {status.lastUpdated
                ? `Loaded ${formatTime(status.lastUpdated)}`
                : 'Not loaded yet'}
            </span>
          )}
        </div>
      ))}
      {effisStatus && (
        <section
          className="effis-fire-legend"
          aria-label="EFFIS detection age legend"
        >
          <strong>EFFIS VIIRS detection age</strong>
          <div className="effis-fire-legend-ages">
            <span><i className="is-six-hours" />≤ 6 hours</span>
            <span><i className="is-twelve-hours" />6–12 hours</span>
            <span><i className="is-day" />12–24 hours</span>
            <span><i className="is-older" />Older · yesterday</span>
          </div>
          <span className="effis-fire-legend-satellites">
            ■ Suomi · ● NOAA-20 · ◆ NOAA-21
          </span>
          <span className="effis-fire-legend-time">
            Source window UTC: {formatEffisWindow()}
            {effisStatus.lastUpdated
              ? ` · Tiles loaded ${formatTime(effisStatus.lastUpdated)}`
              : ''}
          </span>
        </section>
      )}
    </aside>
  )
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatEffisWindow() {
  const today = new Date()
  const yesterday = new Date(today)

  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  return `${formatUtcDate(yesterday)}–${formatUtcDate(today)}`
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
