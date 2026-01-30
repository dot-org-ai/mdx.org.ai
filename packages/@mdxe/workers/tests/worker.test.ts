/**
 * E2E tests for running built workers with Miniflare
 *
 * NOTE: This test file tests the BUILD TOOLS output, not the runtime.
 * It requires Miniflare to be installed as an optional devDependency.
 * Tests are skipped if Miniflare is not available.
 *
 * These tests verify that the build() function produces valid Workers code
 * that can be executed in the workerd runtime via Miniflare.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { join } from 'node:path'

// Dynamic import to handle optional dependency
let Miniflare: typeof import('miniflare').Miniflare | undefined
let buildWorker: typeof import('../src/build.js').buildWorker | undefined

const FIXTURES_DIR = join(__dirname, 'fixtures', 'sample-site')

// Check if Miniflare is available
let miniflareAvailable = false
try {
  const miniflareModule = await import('miniflare')
  Miniflare = miniflareModule.Miniflare
  miniflareAvailable = true
} catch {
  // Miniflare not available
}

// Check if build module is available
try {
  const buildModule = await import('../src/build.js')
  buildWorker = buildModule.buildWorker
} catch {
  // Build module not available (might happen in pure Workers environment)
}

describe.skipIf(!miniflareAvailable || !buildWorker)('@mdxe/workers/build E2E', () => {
  let workerCode: string
  let mf: InstanceType<typeof import('miniflare').Miniflare>

  beforeAll(async () => {
    if (!Miniflare || !buildWorker) {
      return
    }

    // Build the worker
    workerCode = await buildWorker(FIXTURES_DIR, { minify: false })

    // Start Miniflare
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
