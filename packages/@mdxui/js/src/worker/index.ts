/**
 * @mdxui/js Worker - Static Asset Server with Selective Hydration
 *
 * Serves pre-compiled JS component bundles with a snippet-based hydration system.
 * Only loads JS for components that need interactivity via data-hydrate attributes.
 *
 * Endpoints:
 * - /dist/* - Pre-compiled component bundles
 * - /hydrate?components=Counter,ThemeToggle - Selective hydration script
 * - /theme?theme=dark - Theme context injection script
 */

import { generateHydrateScript } from './hydrate'
import { generateThemeScript } from './theme'

/**
 * Environment bindings
 */
interface Env {
  ASSETS: Fetcher
  CSS_WORKER_URL?: string
}

/**
 * Main worker handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      })
    }

    // Handle /hydrate endpoint - selective hydration script
    if (url.pathname === '/hydrate') {
      const componentsParam = url.searchParams.get('components')
      const components = componentsParam ? componentsParam.split(',').map(c => c.trim()) : []

      const script = generateHydrateScript(components)

      return new Response(script, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }

    // Handle /theme endpoint - theme context injection
    if (url.pathname === '/theme') {
      const theme = url.searchParams.get('theme') || 'auto'
      const script = generateThemeScript(theme)

      return new Response(script, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }

    // Handle /runtime endpoint - minimal hydration runtime
    if (url.pathname === '/runtime') {
      // Serve the runtime bundle from assets
      const assetUrl = new URL('/dist/runtime.js', url.origin)
      const assetRequest = new Request(assetUrl, request)
      const response = await env.ASSETS.fetch(assetRequest)

      if (response.ok) {
        const headers = new Headers(response.headers)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value)
        })
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, immutable')

        return new Response(response.body, {
          status: response.status,
          headers,
        })
      }
    }

    // Handle /components/:name endpoint - individual component bundles
    if (url.pathname.startsWith('/components/')) {
      const componentName = url.pathname.replace('/components/', '').replace(/\.js$/, '')
      const assetUrl = new URL(`/dist/components/${componentName}.js`, url.origin)
      const assetRequest = new Request(assetUrl, request)
      const response = await env.ASSETS.fetch(assetRequest)

      if (response.ok) {
        const headers = new Headers(response.headers)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value)
        })
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, immutable')

        return new Response(response.body, {
          status: response.status,
          headers,
        })
      }
    }

    // Handle /dist/* - serve static assets
    if (url.pathname.startsWith('/dist/')) {
      const response = await env.ASSETS.fetch(request)

      if (response.ok) {
        const headers = new Headers(response.headers)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value)
        })

        // Set aggressive caching for /dist bundles (immutable)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')

        return new Response(response.body, {
          status: response.status,
          headers,
        })
      }
    }

    // Default: serve from assets directory
    const response = await env.ASSETS.fetch(request)

    if (response.ok) {
      const headers = new Headers(response.headers)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value)
      })

      return new Response(response.body, {
        status: response.status,
        headers,
      })
    }

    // 404 - Not found
    return new Response(
      JSON.stringify({
        error: 'Not found',
        path: url.pathname,
        endpoints: {
          '/hydrate': 'Selective hydration script (?components=Counter,ThemeToggle)',
          '/theme': 'Theme context injection (?theme=dark|light|auto)',
          '/runtime': 'Minimal hydration runtime bundle',
          '/components/:name': 'Individual component bundle',
          '/dist/*': 'Static assets (pre-compiled bundles)',
        },
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  },
}
