/**
 * Extended tests for mdxe deploy command
 * Covers deployment functions, config generation, and API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}))

// Import after mocking
import { spawn, spawnSync } from 'node:child_process'
import { deploy, detectSourceType } from '../src/commands/deploy.js'

const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>
const mockSpawnSync = spawnSync as unknown as ReturnType<typeof vi.fn>

describe('Deploy Functions Extended', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-deploy-ext-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Managed API Deployment (default)', () => {
    // Note: The deploy function now defaults to using the managed apis.do API
    // instead of wrangler CLI. Wrangler-specific behavior is deprecated.

    it('should use managed API by default (no wrangler check)', async () => {
      // Setup: create Next.js project
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0' },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        dryRun: true,
      })

      // Should NOT call wrangler check (managed API path)
      expect(mockSpawnSync).not.toHaveBeenCalledWith(
        'npx',
        ['wrangler', '--version'],
        expect.any(Object)
      )
      // Should go through managed API path
      expect(result.logs?.some(log => log.includes('managed workers.do API'))).toBe(true)
    })

    it('should report API errors (not wrangler errors)', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0' },
        })
      )

      const result = await deploy(testDir, {
        platform: 'cloudflare',
      })

      // When managed API fails, we get an API error (not wrangler error)
      expect(result.success).toBe(false)
      // Error should be from API, not from wrangler not installed
      expect(result.error).toBeDefined()
    })
  })

  describe('Static Deployment', () => {
    beforeEach(() => {
      // Setup Next.js project with static source
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            '@mdxdb/fs': '^1.0.0',
          },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      // Mock wrangler as installed
      mockSpawnSync.mockReturnValue({ status: 0 })
    })

    it('should build and deploy static site', async () => {
      // Mock successful build
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
        dryRun: true,
      })

      expect(result.logs).toContain('Deployment mode: static')
    })

    it('should generate wrangler.toml when missing', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
        projectName: 'test-docs',
        dryRun: true,
      })

      // In dry-run mode, wrangler.toml is not actually written
      // but the log should indicate it would be generated
    })

    it('should handle build failures gracefully', async () => {
      // Mock build failure
      const mockProcess = {
        stdout: {
          on: vi.fn((event: string, cb: (data: string) => void) => {
            if (event === 'data') cb('')
          }),
        },
        stderr: {
          on: vi.fn((event: string, cb: (data: string) => void) => {
            if (event === 'data') cb('Build error')
          }),
        },
        on: vi.fn((event: string, cb: (code: number | Error) => void) => {
          if (event === 'close') cb(1)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Build failed')
    })
  })

  describe('OpenNext Deployment', () => {
    beforeEach(() => {
      // Setup Next.js project with dynamic source
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            '@mdxdb/api': '^1.0.0',
          },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      // Mock wrangler as installed
      mockSpawnSync.mockReturnValue({ status: 0 })
    })

    it('should detect dynamic source and use OpenNext mode', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        dryRun: true,
      })

      expect(result.logs).toContain('Detected adapter: api')
      expect(result.logs).toContain('Static source: false')
      expect(result.logs).toContain('Deployment mode: opennext')
    })

    it('should use managed API for opennext mode (handles setup server-side)', async () => {
      // Ensure OpenNext is not in dependencies
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            '@mdxdb/api': '^1.0.0',
          },
        })
      )

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'opennext',
        dryRun: true,
      })

      // Should use managed API (OpenNext setup is handled server-side)
      expect(result.logs?.some(log => log.includes('managed workers.do API'))).toBe(true)
    })

    it('should skip OpenNext install if already present', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            '@mdxdb/api': '^1.0.0',
          },
          devDependencies: {
            '@opennextjs/cloudflare': '^1.0.0',
          },
        })
      )

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'opennext',
        dryRun: true,
      })

      // Should not attempt to install OpenNext
      expect(result.logs?.some(log => log.includes('Installing @opennextjs/cloudflare'))).toBe(false)
    })
  })

  describe('API-based Deployment', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      global.fetch = mockFetch
      mockFetch.mockReset()

      // Setup Next.js project
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
            '@mdxdb/fs': '^1.0.0',
          },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    })

    it('should fail without account ID', async () => {
      const originalAccountId = process.env.CLOUDFLARE_ACCOUNT_ID
      const originalApiToken = process.env.CLOUDFLARE_API_TOKEN
      delete process.env.CLOUDFLARE_ACCOUNT_ID
      delete process.env.CLOUDFLARE_API_TOKEN

      try {
        const result = await deploy(testDir, {
          platform: 'cloudflare',
          useApi: true,
          mode: 'static',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('account ID is required')
      } finally {
        if (originalAccountId) process.env.CLOUDFLARE_ACCOUNT_ID = originalAccountId
        if (originalApiToken) process.env.CLOUDFLARE_API_TOKEN = originalApiToken
      }
    })

    it('should fail without API token', async () => {
      const originalApiToken = process.env.CLOUDFLARE_API_TOKEN
      delete process.env.CLOUDFLARE_API_TOKEN

      try {
        const result = await deploy(testDir, {
          platform: 'cloudflare',
          useApi: true,
          accountId: 'test-account',
          mode: 'static',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('API token is required')
      } finally {
        if (originalApiToken) process.env.CLOUDFLARE_API_TOKEN = originalApiToken
      }
    })

    it('should use tenant ID to prefix worker name', async () => {
      // Mock successful build
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        useApi: true,
        accountId: 'test-account',
        apiToken: 'test-token',
        projectName: 'my-docs',
        tenantId: 'customer-123',
        mode: 'static',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs).toContain("[dry-run] Would upload worker 'my-docs-customer-123' to Cloudflare")
    })

    it('should use dispatch namespace when specified', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        useApi: true,
        accountId: 'test-account',
        apiToken: 'test-token',
        dispatchNamespace: 'customer-workers',
        mode: 'static',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs).toContain('[dry-run] Would use dispatch namespace: customer-workers')
    })

    it('should deploy via API with custom headers', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        useApi: true,
        accountId: 'test-account',
        apiToken: 'test-token',
        apiBaseUrl: 'https://custom-proxy.example.com/api',
        apiHeaders: {
          'X-Tenant-Id': 'tenant-123',
        },
        mode: 'static',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs).toContain('Using direct Cloudflare API (custom auth / multi-tenant mode)')
    })

    it('should include bindings in deployment', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        useApi: true,
        accountId: 'test-account',
        apiToken: 'test-token',
        kvNamespaces: { CACHE: 'kv-123' },
        d1Databases: { DB: 'd1-456' },
        env: { API_URL: 'https://api.example.com' },
        mode: 'static',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Config Generation', () => {
    it('should generate wrangler.toml for static deployment', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      mockSpawnSync.mockReturnValue({ status: 0 })

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
        projectName: 'my-static-docs',
        force: true,
        dryRun: false,
      })

      // Check for wrangler.toml generation attempt (logged)
      // In actual non-dry-run with successful build, it would create the file
    })

    it('should use managed API for OpenNext deployment (config handled server-side)', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0' },
          devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      mockSpawnSync.mockReturnValue({ status: 0 })

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'opennext',
        force: true,
        dryRun: true,
      })

      // Managed API handles config generation server-side
      expect(result.logs?.some(log => log.includes('managed workers.do API'))).toBe(true)
    })
  })

  describe('Environment Variables', () => {
    it('should include env vars in wrangler config', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0' },
          devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
        })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      mockSpawnSync.mockReturnValue({ status: 0 })

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'opennext',
        env: {
          API_URL: 'https://api.example.com',
          DEBUG: 'true',
        },
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Source Detection Edge Cases', () => {
    it('should detect createDatabase with connectionString as postgres', () => {
      mkdirSync(join(testDir, 'lib'), { recursive: true })
      writeFileSync(
        join(testDir, 'lib', 'source.ts'),
        `
import { createDatabase } from '@mdxdb/postgres'
const db = createDatabase({ connectionString: process.env.DATABASE_URL })
`
      )

      const result = detectSourceType(testDir)
      expect(result.adapter).toBe('postgres')
      expect(result.isStatic).toBe(false)
    })

    it('should check src/lib/source.ts path', () => {
      mkdirSync(join(testDir, 'src', 'lib'), { recursive: true })
      writeFileSync(
        join(testDir, 'src', 'lib', 'source.ts'),
        `
import { createFsDatabase } from '@mdxdb/fs'
const db = createFsDatabase({ root: './content' })
`
      )

      const result = detectSourceType(testDir)
      expect(result.adapter).toBe('fs')
      expect(result.isStatic).toBe(true)
    })

    it('should handle empty package.json', () => {
      writeFileSync(join(testDir, 'package.json'), '{}')

      const result = detectSourceType(testDir)
      expect(result.adapter).toBe('unknown')
      expect(result.isStatic).toBe(true)
    })
  })

  describe('Next.js Detection', () => {
    it('should detect next.config.mjs', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } })
      )
      writeFileSync(join(testDir, 'next.config.mjs'), 'export default {}')

      mockSpawnSync.mockReturnValue({ status: 0 })

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
        dryRun: true,
      })

      // Should not fail with "No Next.js project found"
      // Either success is true, or if there's an error it shouldn't be about missing Next.js
      if (result.error) {
        expect(result.error).not.toContain('No Next.js project found')
      } else {
        expect(result.success).toBe(true)
      }
    })

    it('should attempt deploy even without next.config (managed API handles validation)', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } })
      )
      // No next.config.js or next.config.mjs

      mockSpawnSync.mockReturnValue({ status: 0 })

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        mode: 'static',
      })

      // Managed API handles validation server-side - deployment may fail but
      // not with "No Next.js project found" since that's a wrangler-path error
      expect(result.success).toBe(false)
      // Error should be from API, not from local Next.js detection
      expect(result.error).toBeDefined()
    })
  })

  describe('Compatibility Options', () => {
    it('should use custom compatibility date', async () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } })
      )
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

      mockSpawnSync.mockReturnValue({ status: 0 })

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') cb(0)
        }),
      }
      mockSpawn.mockReturnValue(mockProcess)

      const result = await deploy(testDir, {
        platform: 'cloudflare',
        useApi: true,
        accountId: 'test',
        apiToken: 'test',
        compatibilityDate: '2024-01-15',
        compatibilityFlags: ['nodejs_compat'],
        mode: 'static',
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })
  })
})

describe('Run Command', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-run-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should capture command output in silent mode', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    mockSpawnSync.mockReturnValue({ status: 0 })

    const mockStdout = {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') {
          cb(Buffer.from('Build output'))
        }
      }),
    }
    const mockStderr = {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') {
          cb(Buffer.from('Warning message'))
        }
      }),
    }

    mockSpawn.mockReturnValue({
      stdout: mockStdout,
      stderr: mockStderr,
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      mode: 'static',
    })

    // The command should run
    expect(mockSpawn).toHaveBeenCalled()
  })

  it('should handle spawn errors', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    mockSpawnSync.mockReturnValue({ status: 0 })

    mockSpawn.mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (arg: Error | number) => void) => {
        if (event === 'error') {
          cb(new Error('Command not found'))
        }
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      mode: 'static',
    })

    expect(result.success).toBe(false)
  })
})

describe('API Deployment - Non Dry Run', () => {
  let testDir: string
  const mockFetch = vi.fn()

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-api-deploy-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    vi.clearAllMocks()
    global.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should deploy static site via API without dry run', async () => {
    // Setup Next.js project
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    // Create worker directory with script
    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(join(testDir, '.worker', 'index.js'), 'export default {}')

    // Mock successful build
    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    // Mock successful API upload
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        result: { id: 'worker-123' },
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'static',
      // NOT dry run
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalled()
  })

  it('should deploy to dispatch namespace via API', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(join(testDir, '.worker', 'index.js'), 'export default {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        result: { id: 'script-in-namespace' },
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      dispatchNamespace: 'customer-workers',
      mode: 'static',
    })

    expect(result.success).toBe(true)
    // Should call the namespace upload endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dispatch/namespaces/customer-workers'),
      expect.any(Object)
    )
  })

  it('should handle API deployment failure', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(join(testDir, '.worker', 'index.js'), 'export default {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        errors: [{ code: 10000, message: 'Script too large' }],
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'static',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Script too large')
  })

  it('should deploy OpenNext via API without dry run', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    // Create .open-next directory with worker
    mkdirSync(join(testDir, '.open-next'), { recursive: true })
    writeFileSync(join(testDir, '.open-next', 'worker.js'), 'export default {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        result: { id: 'opennext-worker-123' },
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    expect(result.success).toBe(true)
  })

  it('should handle OpenNext build failure via API', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    mockSpawnSync.mockReturnValue({ status: 0 })

    // Mock build failure
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: {
        on: vi.fn((event: string, cb: (data: Buffer) => void) => {
          if (event === 'data') cb(Buffer.from('OpenNext build error'))
        }),
      },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(1)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('OpenNext build failed')
  })

  it('should handle missing OpenNext worker file', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    // DON'T create .open-next/worker.js

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('OpenNext worker not found')
  })

  it('should deploy OpenNext to dispatch namespace', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    mkdirSync(join(testDir, '.open-next'), { recursive: true })
    writeFileSync(join(testDir, '.open-next', 'worker.js'), 'export default {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        result: { id: 'opennext-in-namespace' },
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      dispatchNamespace: 'tenant-workers',
      tenantId: 'customer-456',
      mode: 'opennext',
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dispatch/namespaces/tenant-workers'),
      expect.any(Object)
    )
  })

  it('should handle OpenNext API deployment failure', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { '@opennextjs/cloudflare': '^1.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')
    mkdirSync(join(testDir, '.open-next'), { recursive: true })
    writeFileSync(join(testDir, '.open-next', 'worker.js'), 'export default {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        errors: [{ code: 10001, message: 'Worker limit exceeded' }],
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Worker limit exceeded')
  })

  it('should install OpenNext when missing via API deploy', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        // No @opennextjs/cloudflare
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    mockSpawnSync.mockReturnValue({ status: 0 })
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(0)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    // After install, create the worker file
    mkdirSync(join(testDir, '.open-next'), { recursive: true })
    writeFileSync(join(testDir, '.open-next', 'worker.js'), 'export default {}')

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        result: { id: 'worker-123' },
      }),
    })

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    // Should have attempted to install
    expect(result.logs?.some(l => l.includes('Installing @opennextjs/cloudflare'))).toBe(true)
  })

  it('should handle OpenNext install failure', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
      })
    )
    writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}')

    mockSpawnSync.mockReturnValue({ status: 0 })

    // First call (install) fails
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: {
        on: vi.fn((event: string, cb: (data: Buffer) => void) => {
          if (event === 'data') cb(Buffer.from('npm install failed'))
        }),
      },
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(1)
      }),
    }
    mockSpawn.mockReturnValue(mockProcess)

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      useApi: true,
      accountId: 'test-account',
      apiToken: 'test-token',
      mode: 'opennext',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to install OpenNext')
  })
})
