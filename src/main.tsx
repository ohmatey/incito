import { Buffer } from 'buffer'
// Polyfill Buffer for gray-matter (uses Node.js Buffer)
;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PlatformProvider } from './context/PlatformContext'
import { ThemeProvider } from './context/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PlatformProvider>
          <App />
        </PlatformProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
