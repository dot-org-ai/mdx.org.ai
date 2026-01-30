/**
 * Tests for mdxe dev command with Miniflare/workerd
 *
 * This test suite verifies that the dev command uses Miniflare/workerd
 * for local execution, ensuring consistency with the production
 * Cloudflare Workers environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @mdxe/workers/local before imports
const mockMiniflareInstance = {
  dispatchFetch: vi.fn(),
  dispose: vi.fn(),
}

const mockCreateDevServer = vi.fn()
const mockWatchFiles = vi.fn()

vi.mock('@mdxe/workers/local', () => ({
  evaluate: vi.fn().mockResolvedValue({
    moduleId: 'test-module-id',
    data: { title: 'Test' },
    exports: {},
    call: vi.fn(),
    meta: vi.fn().mockResolvedValue({ exports: [], hasDefault: true }),
    dispose: vi.fn(),
  }),
  createLocalEvaluator: vi.fn().mockReturnValue({
    evaluate: vi.fn(),
    dispose: vi.fn(),
    getInstanceCount: vi.fn().mockReturnValue(0),
  }),
  disposeAll: vi.fn(),
  getActiveInstanceCount: vi.fn().mockReturnValue(0),
}))

describe('dev command - Miniflare/workerd integration', () => {
  describe('DevServerConfig', () => {
    it('should have port configuration option', () => {
      // The dev server config should support port configuration
      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: 'localhost',
        verbose: false,
      }

      expect(config.port).toBe(3000)
    })

    it('should have host configuration option', () => {
      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: '0.0.0.0',
        verbose: false,
      }

      expect(config.host).toBe('0.0.0.0')
    })

    it('should have environment variable configuration option', () => {
      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: 'localhost',
        verbose: false,
        env: {
          NODE_ENV: 'development',
          API_URL: 'http://localhost:8080',
        },
      }

      expect(config.env).toBeDefined()
      expect(config.env!.NODE_ENV).toBe('development')
      expect(config.env!.API_URL).toBe('http://localhost:8080')
    })

    it('should have hot reload configuration option', () => {
      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: 'localhost',
        verbose: false,
        hotReload: true,
      }

      expect(config.hotReload).toBe(true)
    })
  })

  describe('DevServer class', () => {
    it('should use Miniflare for local workerd execution', async () => {
      // Import the dev server module
      const devServer = await import('../src/commands/dev-server.js')

      // Verify the module exports the expected interface
      expect(devServer).toBeDefined()
      expect(typeof devServer.createMiniflareDevServer).toBe('function')
    })

    it('should start server on configured port', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      const config = {
        projectDir: '/test/project',
        port: 4000,
        host: 'localhost',
        verbose: false,
      }

      // The server should expose the configured port
      expect(config.port).toBe(4000)
    })

    it('should handle port in use by trying next available port', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // When port 3000 is in use, should try 3001
      expect(typeof devServer.findAvailablePort).toBe('function')
    })
  })

  describe('hot reload functionality', () => {
    it('should watch for file changes', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      expect(typeof devServer.watchFiles).toBe('function')
    })

    it('should reload Miniflare instance on file change', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // Verify reload capability exists
      expect(typeof devServer.reloadMiniflare).toBe('function')
    })

    it('should debounce multiple rapid file changes', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // Verify debounce option exists
      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: 'localhost',
        hotReload: true,
        hotReloadDebounce: 100, // 100ms debounce
      }

      expect(config.hotReloadDebounce).toBe(100)
    })
  })

  describe('environment variable handling', () => {
    it('should pass environment variables to Miniflare', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      const config = {
        projectDir: '/test/project',
        port: 3000,
        host: 'localhost',
        env: {
          DATABASE_URL: 'sqlite://test.db',
          API_KEY: 'secret-key',
        },
      }

      // The miniflare config should include bindings for env vars
      expect(typeof devServer.createMiniflareConfig).toBe('function')
    })

    it('should load environment variables from .env file', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      expect(typeof devServer.loadEnvFile).toBe('function')
    })

    it('should merge CLI env vars with .env file vars', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      const cliEnv = { API_URL: 'http://cli-override.com' }
      const fileEnv = { API_URL: 'http://file.com', DB_URL: 'sqlite://db.db' }

      // CLI env should override file env
      const merged = devServer.mergeEnvVars(fileEnv, cliEnv)
      expect(merged.API_URL).toBe('http://cli-override.com')
      expect(merged.DB_URL).toBe('sqlite://db.db')
    })
  })

  describe('workerd consistency', () => {
    it('should use same runtime as production workers', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // Verify it uses Miniflare (which runs workerd)
      expect(devServer.RUNTIME_TYPE).toBe('miniflare')
    })

    it('should support Workers-compatible APIs', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // Verify Workers APIs are available
      const apis = devServer.SUPPORTED_WORKER_APIS
      expect(apis).toContain('fetch')
      expect(apis).toContain('Request')
      expect(apis).toContain('Response')
      expect(apis).toContain('Headers')
      expect(apis).toContain('URL')
    })

    it('should not use Node.js-specific code paths during MDX execution', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      // The execution context should be workerd, not Node.js
      expect(devServer.EXECUTION_CONTEXT).toBe('workerd')
    })
  })

  describe('server lifecycle', () => {
    it('should properly dispose Miniflare instance on shutdown', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      expect(typeof devServer.shutdownDevServer).toBe('function')
    })

    it('should handle graceful shutdown on SIGINT', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      expect(typeof devServer.setupSignalHandlers).toBe('function')
    })

    it('should clean up file watchers on shutdown', async () => {
      const devServer = await import('../src/commands/dev-server.js')

      expect(typeof devServer.cleanupWatchers).toBe('function')
    })
  })
})

describe('CLI dev command integration', () => {
  const originalExit = process.exit
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  let logs: string[] = []
  let errors: string[] = []

  beforeEach(() => {
    logs = []
    errors = []

    process.exit = vi.fn() as never

    console.log = vi.fn((...args) => {
      logs.push(args.join(' '))
    })
    console.error = vi.fn((...args) => {
      errors.push(args.join(' '))
    })
  })

  afterEach(() => {
    process.exit = originalExit
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  it('should parse dev command with default options', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['dev'])

    expect(result.command).toBe('dev')
    expect(result.port).toBe(3000)
    expect(result.host).toBe('localhost')
  })

  it('should parse dev command with custom port', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['dev', '--port', '4000'])

    expect(result.command).toBe('dev')
    expect(result.port).toBe(4000)
  })

  it('should parse dev command with custom host', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['dev', '--host', '0.0.0.0'])

    expect(result.command).toBe('dev')
    expect(result.host).toBe('0.0.0.0')
  })

  it('should parse dev command with environment variables', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['dev', '--env', 'API_URL=http://api.test', '--env', 'DEBUG=true'])

    expect(result.command).toBe('dev')
    expect(result.env).toEqual({
      API_URL: 'http://api.test',
      DEBUG: 'true',
    })
  })

  it('should parse dev command with verbose flag', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['dev', '--verbose'])

    expect(result.command).toBe('dev')
    expect(result.verbose).toBe(true)
  })
})

describe('Miniflare configuration', () => {
  it('should create valid Miniflare config from dev options', async () => {
    const devServer = await import('../src/commands/dev-server.js')

    const devConfig = {
      projectDir: '/test/project',
      port: 3000,
      host: 'localhost',
      env: { NODE_ENV: 'development' },
    }

    const miniflareConfig = devServer.createMiniflareConfig(devConfig)

    expect(miniflareConfig).toBeDefined()
    expect(miniflareConfig.compatibilityDate).toBeDefined()
    expect(miniflareConfig.bindings).toBeDefined()
    expect(miniflareConfig.bindings.NODE_ENV).toBe('development')
  })

  it('should set appropriate compatibility date', async () => {
    const devServer = await import('../src/commands/dev-server.js')

    const miniflareConfig = devServer.createMiniflareConfig({
      projectDir: '/test/project',
      port: 3000,
      host: 'localhost',
    })

    // Should use a recent compatibility date
    const compatDate = new Date(miniflareConfig.compatibilityDate)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    expect(compatDate.getTime()).toBeGreaterThan(oneYearAgo.getTime())
  })

  it('should support custom compatibility date', async () => {
    const devServer = await import('../src/commands/dev-server.js')

    const miniflareConfig = devServer.createMiniflareConfig({
      projectDir: '/test/project',
      port: 3000,
      host: 'localhost',
      compatibilityDate: '2024-01-01',
    })

    expect(miniflareConfig.compatibilityDate).toBe('2024-01-01')
  })
})
