// global styles shared across the entire site
import * as React from 'react'

import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'

import * as Fathom from 'fathom-client'
// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
import posthog from 'posthog-js'
// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css'
// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css'
import 'styles/global.css'
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import 'styles/notion.css'
// global style overrides for prism theme (optional)
import 'styles/prism-theme.css'

import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  isServer,
  posthogConfig,
  posthogId
} from '@/lib/config'

if (!isServer) {
  bootstrap()
}

// Save the scroll position for the given url
function saveScrollPosition(url: string, element: HTMLElement, savePosition: (url: string, pos: number) => void) {
  savePosition(url, element.scrollTop)
}

// Restore the scroll position for the given url is possible
function restoreScrollPosition(
  url: string,
  element: HTMLElement,
  positions: React.RefObject<{ [key: string]: number }>
) {
  const position = positions.current[url]
  if (position) {
    // console.log('[SCROLL_POSITION]', 'restore', url, position)
    element.scrollTo({ top: position })
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const asPath = React.useRef(router.asPath)
  const positions = React.useRef<{ [key: string]: number }>({})
  const updatePosition = (url: string, position: number) => {
    // console.log('[SCROLL_POSITION]', 'update', url, position)
    positions.current = { ...positions.current, [url]: position }
  }

  React.useEffect(() => {
    function onRouteChangeComplete() {
      if (fathomId) {
        Fathom.trackPageview()
      }

      if (posthogId) {
        posthog.capture('$pageview')
      }
    }

    if (fathomId) {
      Fathom.load(fathomId, fathomConfig)
    }

    if (posthogId) {
      posthog.init(posthogId, posthogConfig)
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    if ('scrollRestoration' in window.history) {
      const element = document.documentElement
      let shouldScrollRestore = false
      window.history.scrollRestoration = 'manual'

      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        saveScrollPosition(router.asPath, element, updatePosition)
        delete event.returnValue
      }

      const handleRouteChangeStart = (url: string) => {
        if (url !== asPath.current) {
          saveScrollPosition(asPath.current, element, updatePosition)
        }
      }

      const handleRouteChangeComplete = (url: string) => {
        asPath.current = url
        if (shouldScrollRestore) {
          shouldScrollRestore = false
          restoreScrollPosition(url, element, positions)
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      router.events.on('routeChangeStart', handleRouteChangeStart)
      router.events.on('routeChangeComplete', handleRouteChangeComplete)
      router.beforePopState(() => {
        shouldScrollRestore = true
        return true
      })

      return () => {
        router.events.off('routeChangeComplete', onRouteChangeComplete)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        router.events.off('routeChangeStart', handleRouteChangeStart)
        router.events.off('routeChangeComplete', handleRouteChangeComplete)
        router.beforePopState(() => true)
      }
    }

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [router.events])

  return <Component {...pageProps} />
}
