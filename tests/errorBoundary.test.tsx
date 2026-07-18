import { expect, test, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WeatherErrorBoundary } from '../src/components/WeatherErrorBoundary'
import { I18nProvider } from '../src/i18n/I18nContext'

test('renders a map fallback with reload recovery after an error', () => {
  const boundary = new WeatherErrorBoundary({
    area: 'map',
    children: null,
    resetKey: 'map'
  })

  boundary.state = WeatherErrorBoundary.getDerivedStateFromError()
  const fallback = boundary.render()
  const markup = renderToStaticMarkup(
    <I18nProvider>{fallback}</I18nProvider>
  )

  expect(markup).toContain('class="render-error render-error-map"')
  expect(markup).toContain('role="alert"')
  expect(markup).toContain('Map could not render')
  expect(markup).toContain('Reload')
})

test('reports rendering failures with their area', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const boundary = new WeatherErrorBoundary({
    area: 'forecast',
    children: null,
    resetKey: 'forecast'
  })

  boundary.componentDidCatch(new Error('boom'), {
    componentStack: 'WeatherDashboard'
  })

  expect(error).toHaveBeenCalledWith(
    'Aether rendering error',
    expect.objectContaining({ area: 'forecast' })
  )
})
