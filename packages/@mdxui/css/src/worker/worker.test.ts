/**
 * @mdxui/css Worker Tests
 *
 * Tests for static asset serving and runtime transforms
 */

import { describe, it, expect, beforeAll } from 'vitest'
import worker from './index'
import { transformCSS, resolveColor, resolveRadius } from './snippets'

describe('@mdxui/css Worker', () => {
  describe('CORS Headers', () => {
    it('should include CORS headers on GET requests', async () => {
      const request = new Request('http://localhost/', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async () =>
            new Response('/* test css */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' },
            }),
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    })

    it('should handle OPTIONS preflight requests', async () => {
      const request = new Request('http://localhost/', { method: 'OPTIONS' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('HTTP Methods', () => {
    it('should reject POST requests', async () => {
      const request = new Request('http://localhost/', { method: 'POST' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(405)
      expect(response.headers.get('Allow')).toBe('GET, OPTIONS')
    })

    it('should reject PUT requests', async () => {
      const request = new Request('http://localhost/', { method: 'PUT' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(405)
    })
  })

  describe('Static Assets', () => {
    it('should serve root as index.css', async () => {
      const request = new Request('http://localhost/', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async (url: URL | Request) => {
            const path = typeof url === 'string' ? url : url instanceof URL ? url.pathname : new URL(url.url).pathname
            expect(path).toBe('/index.css')
            return new Response('/* index.css */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' },
            })
          },
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/css')
      const text = await response.text()
      expect(text).toBe('/* index.css */')
    })

    it('should serve colors.css', async () => {
      const request = new Request('http://localhost/colors.css', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async () =>
            new Response('/* colors.css */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' },
            }),
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('/* colors.css */')
    })

    it('should add .css extension if missing', async () => {
      const request = new Request('http://localhost/themes', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async (url: URL | Request) => {
            const path = typeof url === 'string' ? url : url instanceof URL ? url.pathname : new URL(url.url).pathname
            expect(path).toBe('/themes.css')
            return new Response('/* themes.css */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' },
            })
          },
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
    })

    it('should return 404 for missing files', async () => {
      const request = new Request('http://localhost/nonexistent.css', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async () =>
            new Response('Not Found', {
              status: 404,
            }),
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(404)
      const text = await response.text()
      expect(text).toContain('not found')
    })
  })

  describe('Transform Endpoint', () => {
    it('should handle /transform with no params', async () => {
      const request = new Request('http://localhost/transform', { method: 'GET' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/css')
      const text = await response.text()
      expect(text).toContain('No customizations')
    })

    it('should apply theme preset', async () => {
      const request = new Request('http://localhost/transform?theme=dark', { method: 'GET' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain(':root')
      expect(text).toContain('--background')
      expect(text).toContain('--foreground')
    })

    it('should apply primary color', async () => {
      const request = new Request('http://localhost/transform?primary=blue-500', { method: 'GET' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain('--primary')
      expect(text).toContain('oklch')
    })

    it('should apply radius preset', async () => {
      const request = new Request('http://localhost/transform?radius=lg', { method: 'GET' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain('--radius')
      expect(text).toContain('0.75rem')
    })

    it('should combine multiple params', async () => {
      const request = new Request('http://localhost/transform?theme=dark&primary=indigo-500&radius=xl', {
        method: 'GET',
      })
      const env = {} as any

      const response = await worker.fetch(request, env)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain('--background')
      expect(text).toContain('--primary')
      expect(text).toContain('--radius')
    })

    it('should have shorter cache than static assets', async () => {
      const staticRequest = new Request('http://localhost/', { method: 'GET' })
      const transformRequest = new Request('http://localhost/transform?theme=dark', { method: 'GET' })

      const staticEnv = {
        ASSETS: {
          fetch: async () =>
            new Response('/* css */', {
              status: 200,
            }),
        } as Fetcher,
      }

      const staticResponse = await worker.fetch(staticRequest, staticEnv)
      const transformResponse = await worker.fetch(transformRequest, {} as any)

      const staticCache = staticResponse.headers.get('Cache-Control')
      const transformCache = transformResponse.headers.get('Cache-Control')

      expect(staticCache).toContain('86400') // 24hr
      expect(transformCache).toContain('3600') // 1hr
    })
  })

  describe('Snippets - transformCSS', () => {
    it('should return empty message with no params', () => {
      const params = new URLSearchParams()
      const result = transformCSS(params)
      expect(result).toContain('No customizations')
    })

    it('should apply theme preset', () => {
      const params = new URLSearchParams('theme=dark')
      const result = transformCSS(params)
      expect(result).toContain(':root')
      expect(result).toContain('--background: oklch(14.1% 0.005 285.82)')
      expect(result).toContain('--foreground: oklch(98.5% 0 0)')
    })

    it('should apply primary color', () => {
      const params = new URLSearchParams('primary=blue-500')
      const result = transformCSS(params)
      expect(result).toContain('--primary')
      expect(result).toContain('0.623 0.214 259.815')
    })

    it('should apply radius', () => {
      const params = new URLSearchParams('radius=lg')
      const result = transformCSS(params)
      expect(result).toContain('--radius: 0.75rem')
    })

    it('should handle custom variables', () => {
      const params = new URLSearchParams('accent=purple-400')
      const result = transformCSS(params)
      expect(result).toContain('--accent')
    })

    it('should combine multiple params', () => {
      const params = new URLSearchParams('theme=midnight&primary=violet-500&radius=xl')
      const result = transformCSS(params)
      expect(result).toContain('--background: oklch(10% 0.02 280)')
      expect(result).toContain('--primary: oklch(0.606 0.25 292.717)')
      expect(result).toContain('--radius: 1rem')
    })
  })

  describe('Snippets - resolveColor', () => {
    it('should resolve Tailwind color tokens', () => {
      expect(resolveColor('blue-500')).toContain('oklch')
      expect(resolveColor('indigo-600')).toContain('oklch')
      expect(resolveColor('slate-950')).toContain('oklch')
    })

    it('should pass through OKLCH values', () => {
      const oklch = 'oklch(0.5 0.2 270)'
      expect(resolveColor(oklch)).toBe(oklch)
    })

    it('should pass through hex colors', () => {
      const hex = '#3b82f6'
      expect(resolveColor(hex)).toBe(hex)
    })

    it('should return null for invalid tokens', () => {
      expect(resolveColor('invalid-token')).toBeNull()
      expect(resolveColor('blue-9999')).toBeNull()
    })
  })

  describe('Snippets - resolveRadius', () => {
    it('should resolve radius presets', () => {
      expect(resolveRadius('none')).toBe('0')
      expect(resolveRadius('sm')).toBe('0.25rem')
      expect(resolveRadius('md')).toBe('0.5rem')
      expect(resolveRadius('lg')).toBe('0.75rem')
      expect(resolveRadius('xl')).toBe('1rem')
      expect(resolveRadius('full')).toBe('9999px')
    })

    it('should return null for invalid sizes', () => {
      expect(resolveRadius('invalid')).toBeNull()
    })
  })

  describe('Cache Headers', () => {
    it('should set long cache for static assets', async () => {
      const request = new Request('http://localhost/', { method: 'GET' })
      const env = {
        ASSETS: {
          fetch: async () =>
            new Response('/* css */', {
              status: 200,
            }),
        } as Fetcher,
      }

      const response = await worker.fetch(request, env)
      const cache = response.headers.get('Cache-Control')
      expect(cache).toContain('max-age=86400')
      expect(cache).toContain('public')
    })

    it('should set shorter cache for transforms', async () => {
      const request = new Request('http://localhost/transform', { method: 'GET' })
      const env = {} as any

      const response = await worker.fetch(request, env)
      const cache = response.headers.get('Cache-Control')
      expect(cache).toContain('max-age=3600')
      expect(cache).toContain('public')
    })
  })
})
