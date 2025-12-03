/**
 * E2E tests for running built workers with Miniflare
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { join } from 'node:path'
import { buildWorker } from '../src/build.js'

const FIXTURES_DIR = join(__dirname, 'fixtures', 'sample-site')

describe('@mdxe/workers runtime', () => {
  let workerCode: string
  let mf: import('miniflare').Miniflare

  beforeAll(async () => {
    // Build the worker
    workerCode = await buildWorker(FIXTURES_DIR, { minify: false })

    // Start Miniflare
    const { Miniflare } = await import('miniflare')
    mf = new Miniflare({
      modules: true,
      script: workerCode,
      compatibilityDate: '2024-01-01',
    })
  })

  afterAll(async () => {
    if (mf) {
      await mf.dispose()
    }
  })

  describe('HTTP routes', () => {
    it('should serve the index page', async () => {
      const response = await mf.dispatchFetch('http://localhost/')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Sample Site')
      expect(html).toContain('Welcome')
    })

    it('should serve the about page', async () => {
      const response = await mf.dispatchFetch('http://localhost/about')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('About')
    })

    it('should serve the docs page', async () => {
      const response = await mf.dispatchFetch('http://localhost/docs')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Documentation')
    })

    it('should return 404 for unknown paths', async () => {
      const response = await mf.dispatchFetch('http://localhost/unknown')
      expect(response.status).toBe(404)
    })
  })

  describe('content negotiation', () => {
    it('should return JSON when Accept: application/json', async () => {
      const response = await mf.dispatchFetch('http://localhost/', {
        headers: { Accept: 'application/json' },
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const data = (await response.json()) as { path: string; data: { title: string } }
      // Path is stored as /index in the content bundle
      expect(data.path).toBe('/index')
      expect(data.data.title).toBe('Sample Site')
    })

    it('should return HTML by default', async () => {
      const response = await mf.dispatchFetch('http://localhost/')
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/html')
    })
  })

  describe('special routes', () => {
    it('should serve robots.txt', async () => {
      const response = await mf.dispatchFetch('http://localhost/robots.txt')
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')

      const text = await response.text()
      expect(text).toContain('User-agent')
      expect(text).toContain('Allow')
    })

    it('should serve llms.txt', async () => {
      const response = await mf.dispatchFetch('http://localhost/llms.txt')
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')

      const text = await response.text()
      expect(text).toContain('sample-site')
      expect(text).toContain('Pages')
    })
  })
})
