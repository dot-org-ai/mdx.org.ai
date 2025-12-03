/**
 * Tests for mdxe CLI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseArgs, runDeploy, main, VERSION, type CliOptions } from '../src/cli.js'

// Mock the deploy module
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

    it('should handle missing dir value gracefully', () => {
      const result = parseArgs(['deploy', '--dir'])
      // Should resolve current directory when value is missing
      expect(result.projectDir).toBeDefined()
    })

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
    it('should default platform to cloudflare', () => {
      const result = parseArgs(['deploy'])
      expect(result.platform).toBe('cloudflare')
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
  let mockDeploy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    exitCode = undefined
    logs = []
    errors = []

    // Get the mocked deploy function
    const deployModule = await import('../src/commands/deploy.js')
    mockDeploy = deployModule.deploy as ReturnType<typeof vi.fn>
    mockDeploy.mockReset()

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
      platform: 'cloudflare',
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
      platform: 'cloudflare',
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
      platform: 'cloudflare',
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

  it('should reject unsupported platforms', async () => {
    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'vercel' as 'cloudflare',
      dryRun: false,
      force: false,
      verbose: false,
      env: {},
      help: false,
    }

    await expect(runDeploy(options)).rejects.toThrow('process.exit(1)')
    expect(errors.some(l => l.includes('not yet supported'))).toBe(true)
  })

  it('should show dry run message', async () => {
    mockDeploy.mockResolvedValue({
      success: true,
    })

    const options: CliOptions = {
      command: 'deploy',
      projectDir: '/test/project',
      platform: 'cloudflare',
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

    expect(mockDeploy).toHaveBeenCalledWith('/my/project', {
      platform: 'cloudflare',
      projectName: 'my-docs',
      mode: 'static',
      dryRun: true,
      force: true,
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
      platform: 'cloudflare',
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
  let mockDeploy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    exitCode = undefined
    logs = []
    errors = []

    // Get the mocked deploy function
    const deployModule = await import('../src/commands/deploy.js')
    mockDeploy = deployModule.deploy as ReturnType<typeof vi.fn>
    mockDeploy.mockReset()

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
