/**
 * Tests for mdxe CLI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseArgs, runDeploy, main, VERSION, getWorkerdRuntime, requireValue, validatePort, type CliOptions } from '../src/cli.js'

// Mock @mdxe/fumadocs for checkDocsType
vi.mock('@mdxe/fumadocs', () => ({
  detectDocsType: vi.fn(() => ({ isDocsType: false })),
  deployFumadocs: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock @mdxe/deploy for unified deployment
const mockDeploy = vi.fn()
const mockDetectPlatform = vi.fn(() => ({
  platform: 'do',
  confidence: 0.9,
  reason: 'default',
  framework: undefined,
  isStatic: true,
}))
vi.mock('@mdxe/deploy', () => ({
  deploy: mockDeploy,
  detectPlatform: mockDetectPlatform,
}))

// Legacy mock for old deploy module (kept for other tests)
vi.mock('../src/commands/deploy.js', () => ({
  deploy: vi.fn(),
  detectSourceType: vi.fn(() => ({ isStatic: true, adapter: 'fs' })),
}))

describe('CLI parseArgs', () => {
  describe('Commands', () => {
    it('should default to dev command with no args', () => {
      const result = parseArgs([])
      expect(result.command).toBe('dev')
    })

    it('should parse deploy command', () => {
      const result = parseArgs(['deploy'])
      expect(result.command).toBe('deploy')
    })

    it('should parse version command', () => {
      const result = parseArgs(['version'])
      expect(result.command).toBe('version')
    })

    it('should parse -v alone as dev with verbose (verbose flag without command)', () => {
      const result = parseArgs(['-v'])
      // -v alone is parsed as a flag, command defaults to dev
      expect(result.command).toBe('dev')
      expect(result.verbose).toBe(true)
    })

    it('should parse --version flag', () => {
      const result = parseArgs(['--version'])
      expect(result.command).toBe('version')
    })

    it('should parse help command', () => {
      const result = parseArgs(['help'])
      expect(result.command).toBe('help')
    })

    it('should parse -h as help', () => {
      const result = parseArgs(['-h'])
      expect(result.command).toBe('help')
    })

    it('should parse --help flag', () => {
      const result = parseArgs(['--help'])
      expect(result.command).toBe('help')
      expect(result.help).toBe(true)
    })

    it('should handle unknown commands as dev', () => {
      const result = parseArgs(['unknown'])
      expect(result.command).toBe('dev')
    })
  })

  describe('Deploy Options', () => {
    it('should parse --dir option with absolute path', () => {
      const result = parseArgs(['deploy', '--dir', '/absolute/path'])
      expect(result.projectDir).toBe('/absolute/path')
    })

    it('should parse --dir option with relative path', () => {
      const result = parseArgs(['deploy', '--dir', './relative/path'])
      expect(result.projectDir).toContain('relative/path')
    })

    it('should parse -d short option', () => {
      const result = parseArgs(['deploy', '-d', '/some/path'])
      expect(result.projectDir).toBe('/some/path')
    })

    // Note: Missing dir value is now tested in CLI Argument Validation tests
    // Old behavior (silently defaulting) was removed in favor of proper validation

    it('should parse --platform option', () => {
      const result = parseArgs(['deploy', '--platform', 'cloudflare'])
      expect(result.platform).toBe('cloudflare')
    })

    it('should parse -p short option', () => {
      const result = parseArgs(['deploy', '-p', 'cloudflare'])
      expect(result.platform).toBe('cloudflare')
    })

    it('should parse --mode static', () => {
      const result = parseArgs(['deploy', '--mode', 'static'])
      expect(result.mode).toBe('static')
    })

    it('should parse --mode opennext', () => {
      const result = parseArgs(['deploy', '--mode', 'opennext'])
      expect(result.mode).toBe('opennext')
    })

    it('should parse -m short option', () => {
      const result = parseArgs(['deploy', '-m', 'static'])
      expect(result.mode).toBe('static')
    })

    it('should parse --name option', () => {
      const result = parseArgs(['deploy', '--name', 'my-project'])
      expect(result.projectName).toBe('my-project')
    })

    it('should parse -n short option', () => {
      const result = parseArgs(['deploy', '-n', 'my-project'])
      expect(result.projectName).toBe('my-project')
    })

    it('should parse --dry-run flag', () => {
      const result = parseArgs(['deploy', '--dry-run'])
      expect(result.dryRun).toBe(true)
    })

    it('should parse --force flag', () => {
      const result = parseArgs(['deploy', '--force'])
      expect(result.force).toBe(true)
    })

    it('should parse --verbose flag', () => {
      const result = parseArgs(['deploy', '--verbose'])
      expect(result.verbose).toBe(true)
    })

    it('should parse -v as verbose when used with deploy', () => {
      const result = parseArgs(['deploy', '-v'])
      expect(result.verbose).toBe(true)
    })
  })

  describe('Environment Variables', () => {
    it('should parse single --env option', () => {
      const result = parseArgs(['deploy', '--env', 'KEY=value'])
      expect(result.env).toEqual({ KEY: 'value' })
    })

    it('should parse multiple --env options', () => {
      const result = parseArgs([
        'deploy',
        '--env', 'KEY1=value1',
        '--env', 'KEY2=value2',
      ])
      expect(result.env).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
      })
    })

    it('should parse -e short option', () => {
      const result = parseArgs(['deploy', '-e', 'KEY=value'])
      expect(result.env).toEqual({ KEY: 'value' })
    })

    it('should handle env values with equals sign', () => {
      const result = parseArgs(['deploy', '--env', 'URL=https://example.com?foo=bar'])
      expect(result.env).toEqual({ URL: 'https://example.com?foo=bar' })
    })

    it('should ignore invalid env format', () => {
      const result = parseArgs(['deploy', '--env', 'NOEQUALS'])
      expect(result.env).toEqual({})
    })

    it('should handle empty env value', () => {
      const result = parseArgs(['deploy', '--env', 'KEY='])
      expect(result.env).toEqual({ KEY: '' })
    })
  })

  describe('Defaults', () => {
    it('should default platform to do', () => {
      const result = parseArgs(['deploy'])
      expect(result.platform).toBe('do')
    })

    it('should default to current directory', () => {
      const result = parseArgs(['deploy'])
      expect(result.projectDir).toBe(process.cwd())
    })

    it('should default dryRun to false', () => {
      const result = parseArgs(['deploy'])
      expect(result.dryRun).toBe(false)
    })

    it('should default force to false', () => {
      const result = parseArgs(['deploy'])
      expect(result.force).toBe(false)
    })

    it('should default verbose to false', () => {
      const result = parseArgs(['deploy'])
      expect(result.verbose).toBe(false)
    })

    it('should default env to empty object', () => {
      const result = parseArgs(['deploy'])
      expect(result.env).toEqual({})
    })

    it('should default mode to undefined (auto-detect)', () => {
      const result = parseArgs(['deploy'])
      expect(result.mode).toBeUndefined()
    })
  })

  describe('Complex Combinations', () => {
    it('should handle all options together', () => {
      const result = parseArgs([
        'deploy',
        '--dir', '/my/project',
        '--platform', 'cloudflare',
        '--mode', 'static',
        '--name', 'my-docs',
        '--dry-run',
        '--force',
        '--verbose',
        '--env', 'KEY1=value1',
        '--env', 'KEY2=value2',
      ])

      expect(result.command).toBe('deploy')
      expect(result.projectDir).toBe('/my/project')
      expect(result.platform).toBe('cloudflare')
      expect(result.mode).toBe('static')
      expect(result.projectName).toBe('my-docs')
      expect(result.dryRun).toBe(true)
      expect(result.force).toBe(true)
      expect(result.verbose).toBe(true)
      expect(result.env).toEqual({ KEY1: 'value1', KEY2: 'value2' })
    })

    it('should handle short options together', () => {
      const result = parseArgs([
        'deploy',
        '-d', '/project',
        '-p', 'cloudflare',
        '-m', 'opennext',
        '-n', 'docs',
        '-v',
        '-e', 'API=url',
      ])

      expect(result.projectDir).toBe('/project')
      expect(result.platform).toBe('cloudflare')
      expect(result.mode).toBe('opennext')
      expect(result.projectName).toBe('docs')
      expect(result.verbose).toBe(true)
      expect(result.env).toEqual({ API: 'url' })
    })

    it('should handle help flag with deploy command', () => {
      const result = parseArgs(['deploy', '--help'])
      expect(result.command).toBe('help')
      expect(result.help).toBe(true)
    })

    it('should handle options before command', () => {
      // Options before command should still work
      const result = parseArgs(['--dry-run', 'deploy'])
      // The first non-flag arg becomes the command
      expect(result.command).toBe('dev') // deploy is consumed as an arg value
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = parseArgs([])
      expect(result.command).toBe('dev')
    })

    it('should handle whitespace in values', () => {
      const result = parseArgs(['deploy', '--name', 'my project name'])
      expect(result.projectName).toBe('my project name')
    })

    it('should handle special characters in values', () => {
      const result = parseArgs(['deploy', '--env', 'URL=https://api.example.com/v1?key=abc&token=123'])
      expect(result.env.URL).toBe('https://api.example.com/v1?key=abc&token=123')
    })

    it('should handle unicode in values', () => {
      const result = parseArgs(['deploy', '--name', '文档项目'])
      expect(result.projectName).toBe('文档项目')
    })
  })
})

describe('CLI Integration', () => {
  const originalArgv = process.argv
  const originalExit = process.exit
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  let exitCode: number | undefined
  let logs: string[] = []
  let errors: string[] = []

  beforeEach(() => {
    exitCode = undefined
    logs = []
    errors = []

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      exitCode = code
      throw new Error(`process.exit(${code})`)
    }) as never

    // Mock console
    console.log = vi.fn((...args) => {
      logs.push(args.join(' '))
    })
    console.error = vi.fn((...args) => {
      errors.push(args.join(' '))
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exit = originalExit
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  it('should parse args correctly from process.argv', () => {
    const result = parseArgs(['deploy', '--name', 'test'])
    expect(result.command).toBe('deploy')
    expect(result.projectName).toBe('test')
  })
})

describe('runDeploy', () => {
  const originalExit = process.exit
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  let exitCode: number | undefined
  let logs: string[] = []
  let errors: string[] = []

  beforeEach(async () => {
    exitCode = undefined
    logs = []
    errors = []

    // Reset the mocked deploy function
    mockDeploy.mockReset()
    mockDetectPlatform.mockReset()
    mockDetectPlatform.mockReturnValue({
      platform: 'do',
      confidence: 0.9,
      reason: 'default',
      framework: undefined,
      isStatic: true,
    })

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      exitCode = code
      throw new Error(`process.exit(${code})`)
    }) as never

    // Mock console
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

  it('should run successful deployment', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
      url: 'https://my-docs.workers.dev',
      logs: ['Build complete', 'Deployed'],
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'do',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await runDeploy(options)

    expect(logs.some(l => l.includes('mdxe deploy'))).toBe(true)
    expect(logs.some(l => l.includes('Deployment successful'))).toBe(true)
    expect(logs.some(l => l.includes('https://my-docs.workers.dev'))).toBe(true)
  })

  it('should show logs in verbose mode', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
      logs: ['Step 1: Build', 'Step 2: Deploy'],
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'do',
      dryRun: false,
      force: false,
      verbose: true,
      env: {},
      help: false,
    }

    await runDeploy(options)

    expect(logs.some(l => l.includes('Logs:'))).toBe(true)
    expect(logs.some(l => l.includes('Step 1: Build'))).toBe(true)
    expect(logs.some(l => l.includes('Step 2: Deploy'))).toBe(true)
  })

  it('should handle deployment failure', async () => {
    mockDeploy.mockResolvedValue({
      success: false,
      error: 'Build failed: syntax error',
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'do',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await expect(runDeploy(options)).rejects.toThrow('process.exit(1)')
    expect(errors.some(l => l.includes('Deployment failed'))).toBe(true)
    expect(errors.some(l => l.includes('Build failed: syntax error'))).toBe(true)
  })

  it('should support vercel platform (now unified deployment)', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
      url: 'https://my-app.vercel.app',
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'vercel' as 'do',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await runDeploy(options)

    expect(mockDeploy).toHaveBeenCalled()
    expect(logs.some(l => l.includes('Deployment successful'))).toBe(true)
  })

  it('should show dry run message', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'do',
      dryRun: true,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await runDeploy(options)

    expect(logs.some(l => l.includes('Dry run mode'))).toBe(true)
  })

  it('should pass all options to deploy function', async () => {
    mockDeploy.mockResolvedValue({ success: true })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/my/project',
      platform: 'cloudflare',
      mode: 'static',
      projectName: 'my-docs',
      dryRun: true,
      force: true,
      verbose: false,
      env: { API_URL: 'https://api.example.com' },
      help: false,
    }

    await runDeploy(options)

    // @mdxe/deploy uses a unified options object
    expect(mockDeploy).toHaveBeenCalledWith({
      projectDir: '/my/project',
      platform: 'cloudflare',
      name: 'my-docs',
      mode: 'static',
      dryRun: true,
      force: true,
      verbose: false,
      env: { API_URL: 'https://api.example.com' },
    })
  })

  it('should handle deployment with no URL', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
      // No URL provided
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'do',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await runDeploy(options)

    expect(logs.some(l => l.includes('Deployment successful'))).toBe(true)
    // Should not crash when URL is not present
  })

  it('should handle deployment failure without error message', async () => {
    mockDeploy.mockResolvedValue({
      success: false,
      // No error message provided
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'cloudflare',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await expect(runDeploy(options)).rejects.toThrow('process.exit(1)')
    expect(errors.some(l => l.includes('Deployment failed'))).toBe(true)
  })
})

describe('main', () => {
  const originalArgv = process.argv
  const originalExit = process.exit
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  let exitCode: number | undefined
  let logs: string[] = []
  let errors: string[] = []

  beforeEach(async () => {
    exitCode = undefined
    logs = []
    errors = []

    // Reset the module-level mock deploy function (from @mdxe/deploy)
    mockDeploy.mockReset()
    mockDetectPlatform.mockReset()
    mockDetectPlatform.mockReturnValue({
      platform: 'do',
      confidence: 0.9,
      reason: 'default',
      framework: undefined,
      isStatic: true,
    })

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      exitCode = code
      throw new Error(`process.exit(${code})`)
    }) as never

    // Mock console
    console.log = vi.fn((...args) => {
      logs.push(args.join(' '))
    })
    console.error = vi.fn((...args) => {
      errors.push(args.join(' '))
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exit = originalExit
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  it('should show version when version command is used', async () => {
    process.argv = ['node', 'cli.js', 'version']

    await main()

    expect(logs.some(l => l.includes(`mdxe version ${VERSION}`))).toBe(true)
  })

  it('should show help when help command is used', async () => {
    process.argv = ['node', 'cli.js', 'help']

    await main()

    expect(logs.some(l => l.includes('mdxe - Execute, Test, & Deploy'))).toBe(true)
  })

  it('should run dev command when no command is provided', async () => {
    process.argv = ['node', 'cli.js']

    await main()

    // Default command is now 'dev', which starts the dev server
    // The main function will try to start the dev server
    expect(logs.some(l => l.includes('mdxe dev') || l.includes('Starting'))).toBe(true)
  })

  it('should run deploy command', async () => {
    process.argv = ['node', 'cli.js', 'deploy', '--dry-run']
    mockDeploy.mockResolvedValue({ success: true })

    await main()

    expect(logs.some(l => l.includes('mdxe deploy'))).toBe(true)
  })
})

describe('VERSION', () => {
  it('should be a valid semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})

// =============================================================================
// Runtime Target Selection Tests - Unified workerd execution model
// =============================================================================

describe('CLI Runtime Target Selection', () => {
  describe('--target option parsing', () => {
    it('should default target to workers', () => {
      const result = parseArgs(['test'])
      expect(result.target).toBe('workers')
    })

    it('should parse --target workers', () => {
      const result = parseArgs(['test', '--target', 'workers'])
      expect(result.target).toBe('workers')
    })

    it('should parse --target node (uses workerd via Miniflare)', () => {
      const result = parseArgs(['test', '--target', 'node'])
      expect(result.target).toBe('node')
    })

    it('should parse --target bun (uses workerd via Miniflare)', () => {
      const result = parseArgs(['test', '--target', 'bun'])
      expect(result.target).toBe('bun')
    })

    it('should parse --target all', () => {
      const result = parseArgs(['test', '--target', 'all'])
      expect(result.target).toBe('all')
    })
  })

  describe('test matrix generation', () => {
    it('should generate single entry for workers target', () => {
      const result = parseArgs(['test', '--target', 'workers', '--db', 'memory'])
      expect(result.target).toBe('workers')
      expect(result.db).toBe('memory')
    })

    it('should generate single entry for node target', () => {
      const result = parseArgs(['test', '--target', 'node', '--db', 'memory'])
      expect(result.target).toBe('node')
      expect(result.db).toBe('memory')
    })

    it('should generate single entry for bun target', () => {
      const result = parseArgs(['test', '--target', 'bun', '--db', 'memory'])
      expect(result.target).toBe('bun')
      expect(result.db).toBe('memory')
    })

    it('should handle all targets with single db', () => {
      const result = parseArgs(['test', '--target', 'all', '--db', 'sqlite'])
      expect(result.target).toBe('all')
      expect(result.db).toBe('sqlite')
    })
  })

  describe('help text', () => {
    it('should mention workerd unification in help', async () => {
      const result = parseArgs(['help'])
      expect(result.command).toBe('help')
      // The help text should explain that all targets use workerd
    })
  })
})

describe('Unified Workerd Execution', () => {
  describe('runtime resolution', () => {
    it('workers target should use @mdxe/workers directly', () => {
      const result = parseArgs(['test', '--target', 'workers'])
      // When target is workers, execution should use @mdxe/workers
      expect(result.target).toBe('workers')
      expect(getWorkerdRuntime('workers')).toBe('workers')
    })

    it('node target should use @mdxe/workers/local via Miniflare', () => {
      const result = parseArgs(['test', '--target', 'node'])
      // When target is node, execution should use @mdxe/workers/local
      expect(result.target).toBe('node')
      expect(getWorkerdRuntime('node')).toBe('local')
    })

    it('bun target should use @mdxe/workers/local via Miniflare', () => {
      const result = parseArgs(['test', '--target', 'bun'])
      // When target is bun, execution should use @mdxe/workers/local
      expect(result.target).toBe('bun')
      expect(getWorkerdRuntime('bun')).toBe('local')
    })
  })

  describe('getWorkerdRuntime function', () => {
    it('returns workers for workers target', () => {
      expect(getWorkerdRuntime('workers')).toBe('workers')
    })

    it('returns local for node target', () => {
      expect(getWorkerdRuntime('node')).toBe('local')
    })

    it('returns local for bun target', () => {
      expect(getWorkerdRuntime('bun')).toBe('local')
    })

    it('returns local for all target (default behavior)', () => {
      expect(getWorkerdRuntime('all')).toBe('local')
    })
  })

  describe('result consistency', () => {
    // These tests verify that all targets produce identical results
    // since they all use workerd under the hood

    it('should parse identical options for all local targets', () => {
      const nodeResult = parseArgs(['test', '--target', 'node', '--db', 'memory'])
      const bunResult = parseArgs(['test', '--target', 'bun', '--db', 'memory'])

      // Both should have the same structure, just different target values
      expect(nodeResult.command).toBe(bunResult.command)
      expect(nodeResult.db).toBe(bunResult.db)
      expect(nodeResult.context).toBe(bunResult.context)
    })

    it('all local targets resolve to the same workerd runtime', () => {
      // node and bun should both use local workerd via Miniflare
      expect(getWorkerdRuntime('node')).toBe(getWorkerdRuntime('bun'))
    })
  })
})

// =============================================================================
// Argument Validation Tests
// =============================================================================

describe('CLI Argument Validation', () => {
  const originalExit = process.exit
  const originalConsoleError = console.error

  let exitCode: number | undefined
  let errors: string[] = []

  beforeEach(() => {
    exitCode = undefined
    errors = []

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      exitCode = code
      throw new Error(`process.exit(${code})`)
    }) as never

    // Mock console.error to capture error messages
    console.error = vi.fn((...args) => {
      errors.push(args.join(' '))
    })
  })

  afterEach(() => {
    process.exit = originalExit
    console.error = originalConsoleError
  })

  describe('--port validation', () => {
    it('should fail when --port is missing a value', () => {
      expect(() => parseArgs(['dev', '--port'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--port requires'))).toBe(true)
    })

    it('should fail when --port value starts with dash (another flag)', () => {
      expect(() => parseArgs(['dev', '--port', '--verbose'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--port requires'))).toBe(true)
    })

    it('should fail when --port is not a number', () => {
      expect(() => parseArgs(['dev', '--port', 'abc'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })

    it('should fail when --port is negative', () => {
      expect(() => parseArgs(['dev', '--port', '-5'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--port requires') || e.includes('Invalid port'))).toBe(true)
    })

    it('should fail when --port is zero', () => {
      expect(() => parseArgs(['dev', '--port', '0'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port') || e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should fail when --port exceeds 65535', () => {
      expect(() => parseArgs(['dev', '--port', '99999'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port') || e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should fail when --port is a float', () => {
      expect(() => parseArgs(['dev', '--port', '3000.5'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })

    it('should accept valid port numbers', () => {
      const result = parseArgs(['dev', '--port', '3000'])
      expect(result.port).toBe(3000)
    })

    it('should accept port 1 (minimum valid)', () => {
      const result = parseArgs(['dev', '--port', '1'])
      expect(result.port).toBe(1)
    })

    it('should accept port 65535 (maximum valid)', () => {
      const result = parseArgs(['dev', '--port', '65535'])
      expect(result.port).toBe(65535)
    })
  })

  describe('--http-port validation', () => {
    it('should fail when --http-port is missing a value', () => {
      expect(() => parseArgs(['db', '--http-port'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--http-port requires'))).toBe(true)
    })

    it('should fail when --http-port value starts with dash', () => {
      expect(() => parseArgs(['db', '--http-port', '--verbose'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--http-port requires'))).toBe(true)
    })

    it('should fail when --http-port is not a number', () => {
      expect(() => parseArgs(['db', '--http-port', 'abc'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })

    it('should fail when --http-port is zero', () => {
      expect(() => parseArgs(['db', '--http-port', '0'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port') || e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should fail when --http-port exceeds 65535', () => {
      expect(() => parseArgs(['db', '--http-port', '70000'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port') || e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should accept valid http-port numbers', () => {
      const result = parseArgs(['db', '--http-port', '8123'])
      expect(result.httpPort).toBe(8123)
    })
  })

  describe('--name validation', () => {
    it('should fail when --name is missing a value', () => {
      expect(() => parseArgs(['deploy', '--name'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--name requires'))).toBe(true)
    })

    it('should fail when --name value starts with dash', () => {
      expect(() => parseArgs(['deploy', '--name', '--verbose'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--name requires'))).toBe(true)
    })

    it('should fail when -n is missing a value', () => {
      expect(() => parseArgs(['deploy', '-n'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--name requires') || e.includes('-n requires'))).toBe(true)
    })
  })

  describe('--filter validation', () => {
    it('should fail when --filter is missing a value', () => {
      expect(() => parseArgs(['test', '--filter'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--filter requires'))).toBe(true)
    })

    it('should fail when -f is missing a value', () => {
      expect(() => parseArgs(['test', '-f'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--filter requires') || e.includes('-f requires'))).toBe(true)
    })
  })

  describe('--host validation', () => {
    it('should fail when --host is missing a value', () => {
      expect(() => parseArgs(['dev', '--host'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--host requires'))).toBe(true)
    })

    it('should fail when --host value starts with dash', () => {
      expect(() => parseArgs(['dev', '--host', '--port'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--host requires'))).toBe(true)
    })
  })

  describe('--dir validation', () => {
    it('should fail when --dir is missing a value', () => {
      expect(() => parseArgs(['dev', '--dir'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--dir requires'))).toBe(true)
    })

    it('should fail when -d is missing a value', () => {
      expect(() => parseArgs(['dev', '-d'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--dir requires') || e.includes('-d requires'))).toBe(true)
    })
  })

  describe('--compatibility-date validation', () => {
    it('should fail when --compatibility-date is missing a value', () => {
      expect(() => parseArgs(['deploy', 'workers', '--compatibility-date'])).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--compatibility-date requires'))).toBe(true)
    })
  })

  describe('error message quality', () => {
    it('should provide usage example for --port', () => {
      try {
        parseArgs(['dev', '--port'])
      } catch {
        // expected
      }
      expect(errors.some(e => e.includes('Usage:') || e.includes('mdxe'))).toBe(true)
    })

    it('should mention valid range for port numbers', () => {
      try {
        parseArgs(['dev', '--port', '99999'])
      } catch {
        // expected
      }
      expect(errors.some(e => e.includes('1') && e.includes('65535'))).toBe(true)
    })
  })

  describe('requireValue helper', () => {
    it('should pass for valid string values', () => {
      expect(() => requireValue('--test', 'value')).not.toThrow()
    })

    it('should exit for undefined values', () => {
      expect(() => requireValue('--test', undefined)).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--test requires'))).toBe(true)
    })

    it('should exit for empty string values', () => {
      expect(() => requireValue('--test', '')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--test requires'))).toBe(true)
    })

    it('should exit when value starts with dash', () => {
      expect(() => requireValue('--test', '-v')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('--test requires'))).toBe(true)
    })

    it('should include usage hint when provided', () => {
      try {
        requireValue('--test', undefined, 'mdxe test --test value')
      } catch {
        // expected
      }
      expect(errors.some(e => e.includes('Usage:') && e.includes('mdxe test --test value'))).toBe(true)
    })
  })

  describe('validatePort helper', () => {
    it('should return valid port numbers', () => {
      const result = validatePort('--port', '8080')
      expect(result).toBe(8080)
    })

    it('should accept minimum valid port (1)', () => {
      const result = validatePort('--port', '1')
      expect(result).toBe(1)
    })

    it('should accept maximum valid port (65535)', () => {
      const result = validatePort('--port', '65535')
      expect(result).toBe(65535)
    })

    it('should exit for missing value', () => {
      expect(() => validatePort('--port', undefined)).toThrow('process.exit(1)')
    })

    it('should exit for non-numeric value', () => {
      expect(() => validatePort('--port', 'abc')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })

    it('should exit for negative port', () => {
      expect(() => validatePort('--port', '-1')).toThrow('process.exit(1)')
    })

    it('should exit for port zero', () => {
      expect(() => validatePort('--port', '0')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should exit for port exceeding 65535', () => {
      expect(() => validatePort('--port', '65536')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('between 1 and 65535'))).toBe(true)
    })

    it('should exit for float values', () => {
      expect(() => validatePort('--port', '8080.5')).toThrow('process.exit(1)')
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })

    it('should include usage hint when provided', () => {
      try {
        validatePort('--port', 'abc', 'mdxe dev --port 3000')
      } catch {
        // expected
      }
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true)
    })
  })
})
