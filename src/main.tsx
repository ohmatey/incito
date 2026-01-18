import { Buffer } from 'buffer'
// Polyfill Buffer for gray-matter (uses Node.js Buffer)
;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { PlatformProvider } from './context/PlatformContext'
import { ThemeProvider } from './context/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <PlatformProvider>
          <RouterProvider router={router} />
        </PlatformProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
