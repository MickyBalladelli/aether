import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(React.StrictMode, null,
    React.createElement(I18nProvider, null,
      React.createElement(App)
    )
  )
)
