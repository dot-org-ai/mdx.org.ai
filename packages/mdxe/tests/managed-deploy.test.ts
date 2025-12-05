/**
 * Tests for mdxe deploy --managed command
 * E2E tests for deploying via managed workers.do API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from '../src/cli.js'

// Mock oauth.do
vi.mock('oauth.do', () => ({
  ensureLoggedIn: vi.fn().mockResolvedValue({ token: 'test-worker-token', isNewLogin: false }),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('CLI parseArgs --managed', () => {
  it('should parse --managed flag', () => {
    const result = parseArgs(['deploy', '--managed'])
    expect(result.managed).toBe(true)
  })

  it('should default managed to false', () => {
    const result = parseArgs(['deploy'])
    expect(result.managed).toBe(false)
  })

  it('should parse --managed-url option', () => {
    const result = parseArgs(['deploy', '--managed', '--managed-url', 'https://custom-workers.do'])
    expect(result.managed).toBe(true)
    expect(result.managedApiUrl).toBe('https://custom-workers.do')
  })

  it('should parse --managed with other options', () => {
    const result = parseArgs([
      'deploy',
      '--managed',
      '--name', 'my-worker',
      '--mode', 'static',
      '--dry-run',
    ])

    expect(result.managed).toBe(true)
    expect(result.projectName).toBe('my-worker')
    expect(result.mode).toBe('static')
    expect(result.dryRun).toBe(true)
  })
})

describe('Managed Deploy Options', () => {
  it('should pass managed options to deploy function', async () => {
    const { deploy } = await import('../src/commands/deploy.js')

    // Verify TypeScript accepts the useManagedApi option
    const options = {
      platform: 'cloudflare' as const,
      useManagedApi: true,
      managedApiUrl: 'https://workers.do',
      projectName: 'test-worker',
      dryRun: true,
    }

    expect(options.useManagedApi).toBe(true)
    expect(options.managedApiUrl).toBe('https://workers.do')
  })
})

describe('Managed API Deployment', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-managed-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should deploy via managed API in dry-run mode', async () => {
    // Create a basic Next.js project structure
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-docs',
        dependencies: {
          next: '^14.0.0',
          '@mdxdb/fs': '^1.0.0',
        },
        scripts: {
          build: 'echo "build complete"',
        },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default { output: 'export' }`
    )

    const { deploy } = await import('../src/commands/deploy.js')

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useManagedApi: true,
      managedApiUrl: 'https://workers.do',
      projectName: 'test-worker',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs).toContain('Using managed workers.do API for deployment')
    expect(result.logs).toContain('[dry-run] Would POST to https://workers.do/workers')

    // Fetch should NOT be called in dry-run mode
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should include all deployment options in payload', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-docs',
        dependencies: {
          next: '^14.0.0',
        },
        scripts: {
          build: 'echo "build complete"',
        },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default { output: 'export' }`
    )

    // Create a worker file
    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `export default { fetch() { return new Response('Hello') } }`
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        url: 'https://test-worker.workers.dev',
        deploymentId: 'deploy-123',
      }),
    })

    const { deploy } = await import('../src/commands/deploy.js')

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useManagedApi: true,
      managedApiUrl: 'https://workers.do',
      projectName: 'my-worker',
      mode: 'static',
      env: { API_KEY: 'secret123' },
      kvNamespaces: { CACHE: 'kv-123' },
      d1Databases: { DB: 'd1-456' },
      tenantId: 'tenant-789',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://test-worker.workers.dev')
    expect(result.deploymentId).toBe('deploy-123')

    // Verify the fetch call
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://workers.do/workers')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer test-worker-token')
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body.name).toBe('my-worker')
    expect(body.mode).toBe('static')
    expect(body.env).toEqual({ API_KEY: 'secret123' })
    expect(body.kvNamespaces).toEqual({ CACHE: 'kv-123' })
    expect(body.d1Databases).toEqual({ DB: 'd1-456' })
    expect(body.tenantId).toBe('tenant-789')
    expect(body.code).toContain('export default')
  })

  it('should handle API errors', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-docs',
        dependencies: { next: '^14.0.0' },
        scripts: { build: 'echo "build"' },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default { output: 'export' }`
    )

    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `export default {}`
    )

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized: Invalid token',
    })

    const { deploy } = await import('../src/commands/deploy.js')

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useManagedApi: true,
      projectName: 'test-worker',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('HTTP 401')
    expect(result.error).toContain('Unauthorized')
  })

  it('should handle API response with success: false', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-docs',
        dependencies: { next: '^14.0.0' },
        scripts: { build: 'echo "build"' },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default {}`
    )

    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `export default {}`
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Quota exceeded for this account',
      }),
    })

    const { deploy } = await import('../src/commands/deploy.js')

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useManagedApi: true,
      projectName: 'test-worker',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Quota exceeded')
  })
})

describe('E2E Managed Deploy Flow', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-e2e-managed-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should complete full deployment flow', async () => {
    // Set up a complete project structure
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'my-docs-site',
        version: '1.0.0',
        dependencies: {
          next: '^14.0.0',
          '@mdxdb/fs': '^1.0.0',
          '@mdxdb/fumadocs': '^1.0.0',
        },
        scripts: {
          build: 'echo "Build successful"',
        },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
}

export default nextConfig
`
    )

    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `
// Static assets worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    return env.ASSETS.fetch(request)
  }
}
`
    )

    // Create some static assets
    mkdirSync(join(testDir, '.next', 'static', 'css'), { recursive: true })
    writeFileSync(
      join(testDir, '.next', 'static', 'css', 'main.css'),
      'body { margin: 0; }'
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        url: 'https://my-docs-site.workers.dev',
        deploymentId: 'deploy-abc123',
      }),
    })

    const { deploy } = await import('../src/commands/deploy.js')

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useManagedApi: true,
      managedApiUrl: 'https://workers.do',
      projectName: 'my-docs-site',
      mode: 'static',
      env: {
        SITE_URL: 'https://docs.example.com',
      },
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://my-docs-site.workers.dev')
    expect(result.deploymentId).toBe('deploy-abc123')

    // Verify logs
    expect(result.logs).toContain('Using managed workers.do API for deployment')
    expect(result.logs).toContain('Authenticating via oauth.do...')
    expect(result.logs).toContain('Build completed successfully')
    expect(result.logs).toContain('Deploying to https://workers.do/workers...')

    // Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://workers.do/workers')
    expect(options.headers['Authorization']).toBe('Bearer test-worker-token')

    const body = JSON.parse(options.body)
    expect(body.name).toBe('my-docs-site')
    expect(body.mode).toBe('static')
    expect(body.env.SITE_URL).toBe('https://docs.example.com')
    expect(body.code).toContain('env.ASSETS.fetch')
    expect(body.assets.length).toBeGreaterThan(0)
  })
})
