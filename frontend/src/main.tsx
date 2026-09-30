/**
 * Suppress benign Google telemetry blocked by ad-blockers.
 * GSI / AccountChooser loads https://play.google.com/log?... which uBlock/AdGuard blocks
 * with ERR_BLOCKED_BY_CLIENT. This is not a CampusResolve bug — we short-circuit it
 * before it hits the network and filter its console noise.
 */
if (typeof window !== 'undefined') {
  const _origFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url || ''
    if (typeof url === 'string' && url.includes('play.google.com/log')) {
      return Promise.resolve(new Response('', { status: 204, statusText: 'No Content' }))
    }
    return _origFetch(input as RequestInfo, init)
  }

  const _origBeacon = navigator.sendBeacon?.bind(navigator)
  if (_origBeacon) {
    // Patch sendBeacon so Google's telemetry pings resolve locally instead of
    // hitting the network (the assignment satisfies lib.dom's signature).
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const s = typeof url === 'string' ? url : url.toString()
      if (s.includes('play.google.com/log')) return true
      return _origBeacon(s as string, data as any)
    }
  }

  // Filter console noise from Google's obfuscated `m=` loader (m=n73qwf,...) and accountchooser
  const _origError = console.error.bind(console)
  const _origWarn = console.warn.bind(console)
  const _shouldSuppress = (args: any[]) => {
    const first = args[0]
    const msg = typeof first === 'string' ? first : String(first ?? '')
    return msg.includes('play.google.com/log') || msg.includes('ERR_BLOCKED_BY_CLIENT') || msg.includes('accountchooser') || msg.includes('m=n73qwf')
  }
  console.error = (...args: any[]) => { if (_shouldSuppress(args)) return; _origError(...args) }
  console.warn = (...args: any[]) => { if (_shouldSuppress(args)) return; _origWarn(...args) }

  window.addEventListener('error', (e) => {
    const msg = e.message || ''
    const src = (e.filename || '') as string
    if (msg.includes('play.google.com/log') || src.includes('play.google.com') || src.includes('accountchooser')) {
      e.preventDefault()
    }
  })
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String((e.reason as any)?.message || e.reason || '')
    if (msg.includes('play.google.com/log') || msg.includes('ERR_BLOCKED_BY_CLIENT')) {
      e.preventDefault()
    }
  })
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/tailwind.css'
import './styles/animations.css'
import './styles/global.css'
import './styles/paperTheme.css'

import ErrorBoundary from './components/shared/ErrorBoundary'
import { ToastProvider } from './components/shared/ToastNotification'

import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { GlobalAIAgentProvider } from './context/GlobalAIAgentContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <ToastProvider>
            <SocketProvider>
              <NotificationProvider>
                <GlobalAIAgentProvider>
                  <App />
                </GlobalAIAgentProvider>
              </NotificationProvider>
            </SocketProvider>
          </ToastProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
