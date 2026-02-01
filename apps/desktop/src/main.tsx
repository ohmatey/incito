import { Buffer } from 'buffer'
// Polyfill Buffer for gray-matter (uses Node.js Buffer)
;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { PlatformProvider } from './context/PlatformContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { PostHogProvider } from './context/PostHogContext'
import { FeatureFlagsProvider } from './context/FeatureFlagsContext'
import { RunModeProvider } from './context/RunModeContext'
import { AddonProvider } from './context/AddonContext'
import { UpdateProvider } from './context/UpdateContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './i18n' // Initialize i18n
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <PostHogProvider>
            <PlatformProvider>
              <FeatureFlagsProvider>
                <RunModeProvider>
                  <AddonProvider>
                    <UpdateProvider>
                      <RouterProvider router={router} />
                    </UpdateProvider>
                  </AddonProvider>
                </RunModeProvider>
              </FeatureFlagsProvider>
            </PlatformProvider>
          </PostHogProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
