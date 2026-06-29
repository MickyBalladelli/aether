import { expect, test, vi } from 'vitest'
import { WeatherErrorBoundary } from '../src/components/WeatherErrorBoundary'

test('renders a map fallback with reload recovery after an error', () => {
  const boundary = new WeatherErrorBoundary({
    area: 'map',
    children: null,
    resetKey: 'map'
  })

  boundary.state = WeatherErrorBoundary.getDerivedStateFromError()
  const fallback = boundary.render()

  expect(fallback).toMatchObject({
    props: {
      className: 'render-error render-error-map',
      role: 'alert'
    }
  })
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
