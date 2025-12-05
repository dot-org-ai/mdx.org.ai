/**
 * Cloudflare Worker for @mdxui/css
 *
 * Serves pre-compiled CSS as static assets (free) with optional
 * runtime transforms for dynamic theming (minimal compute cost).
 *
 * Routes:
 *   GET /                      → dist/index.css (full CSS bundle)
 *   GET /colors.css            → dist/colors.css (color utilities)
 *   GET /themes.css            → dist/themes.css (theme presets)
 *   GET /transform?params      → Runtime CSS customization
 *
 * Transform Query Parameters:
 *   ?theme=dark|light|dim|midnight
 *   ?primary=blue-500 (Tailwind color token)
 *   ?radius=sm|md|lg|xl
 *   ?[var]=[value] (any CSS variable)
 *
 * Example:
 *   /transform?theme=dark&primary=indigo-500&radius=lg
 */

import { transformCSS, resolveColor, resolveRadius } from './snippets'

export interface Env {
  ASSETS: Fetcher
  ENVIRONMENT?: string
}

/**
 * Common CORS headers for CSS responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * CSS headers with caching
 */
const CSS_HEADERS = {
  'Content-Type': 'text/css; charset=utf-8',
  'Cache-Control': 'public, max-age=86400, s-maxage=86400',
  ...CORS_HEADERS,
}

/**
 * Transform headers (shorter cache for dynamic content)
 */
const TRANSFORM_HEADERS = {
  'Content-Type': 'text/css; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  ...CORS_HEADERS,
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: CORS_HEADERS,
      })
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, OPTIONS' },
      })
    }

    try {
      // Route: /transform - Runtime CSS customization
      if (pathname === '/transform') {
        const css = transformCSS(url.searchParams)
        return new Response(css, { headers: TRANSFORM_HEADERS })
      }

      // Route: Static assets from /dist
      // Serve pre-compiled CSS files as static assets
      let assetPath = pathname

      // Map root to index.css
      if (assetPath === '/' || assetPath === '') {
        assetPath = '/index.css'
      }

      // Ensure .css extension
      if (!assetPath.endsWith('.css')) {
        assetPath += '.css'
      }

      // Fetch from static assets
      const assetUrl = new URL(assetPath, url.origin)
      const assetResponse = await env.ASSETS.fetch(assetUrl)

      if (assetResponse.status === 404) {
        return new Response(`/* File not found: ${assetPath} */`, {
          status: 404,
          headers: CSS_HEADERS,
        })
      }

      // Clone response with CSS headers
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: CSS_HEADERS,
      })
    } catch (error) {
      console.error('Worker error:', error)
      return new Response('/* Internal Server Error */', {
        status: 500,
        headers: CSS_HEADERS,
      })
    }
  },
}
