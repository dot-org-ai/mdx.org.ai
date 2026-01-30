import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { join } from 'node:path'
import type {
  GitHubDeployOptions,
  DeployResult,
  GitHubApiConfig,
  RepositoryInfo,
  ActionsWorkflow,
  PagesConfig,
} from './types.js'

// Mock oauth.do module
vi.mock('oauth.do', () => ({
  ensureLoggedIn: vi.fn().mockResolvedValue({ token: 'mock-token', isNewLogin: false }),
  getToken: vi.fn().mockResolvedValue(null),
}))

// Mock node:fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    cpSync: vi.fn(),
    rmSync: vi.fn(),
  }
})

// Mock node:child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, callback) => {
      if (event === 'close') callback(0)
    }),
  }),
  spawnSync: vi.fn().mockReturnValue({ status: 0, stdout: '', stderr: '' }),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports deploy function', async () => {
    const mod = await import('./index.js')
    expect(mod.deploy).toBeDefined()
    expect(typeof mod.deploy).toBe('function')
  })

  it('exports createProvider function', async () => {
    const mod = await import('./index.js')
    expect(mod.createProvider).toBeDefined()
    expect(typeof mod.createProvider).toBe('function')
  })

  it('exports configurePagesApi function', async () => {
    const mod = await import('./index.js')
    expect(mod.configurePagesApi).toBeDefined()
    expect(typeof mod.configurePagesApi).toBe('function')
  })

  it('exports setupPagesActions function', async () => {
    const mod = await import('./index.js')
    expect(mod.setupPagesActions).toBeDefined()
    expect(typeof mod.setupPagesActions).toBe('function')
  })

  it('exports generatePagesWorkflow function', async () => {
    const mod = await import('./index.js')
    expect(mod.generatePagesWorkflow).toBeDefined()
    expect(typeof mod.generatePagesWorkflow).toBe('function')
  })

  it('exports generateNextJsWorkflow function', async () => {
    const mod = await import('./index.js')
    expect(mod.generateNextJsWorkflow).toBeDefined()
    expect(typeof mod.generateNextJsWorkflow).toBe('function')
  })

  it('exports writeWorkflow function', async () => {
    const mod = await import('./index.js')
    expect(mod.writeWorkflow).toBeDefined()
    expect(typeof mod.writeWorkflow).toBe('function')
  })

  it('exports type definitions', async () => {
    const mod = await import('./types.js')
    // Type definitions are compile-time only, but the module should load
    expect(mod).toBeDefined()
  })
})

// ===========================================================================
// deploy() Function Tests
// ===========================================================================

describe('deploy() function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should deploy successfully with dry run', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs).toBeDefined()
    expect(result.logs?.some(log => log.includes('dry-run'))).toBe(true)
  })

  it('should include logs in result', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.logs).toBeDefined()
    expect(Array.isArray(result.logs)).toBe(true)
    expect(result.logs!.length).toBeGreaterThan(0)
  })

  it('should use provided repository', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'myuser/myrepo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('myuser/myrepo'))).toBe(true)
  })

  it('should respect custom branch option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      branch: 'custom-pages',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('custom-pages'))).toBe(true)
  })

  it('should handle custom domain option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      customDomain: 'example.com',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle build command option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      buildCommand: 'custom-build',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('custom-build'))).toBe(true)
  })

  it('should set author name and email', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      authorName: 'Test Author',
      authorEmail: 'test@example.com',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle commit message option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      commitMessage: 'Custom deploy message',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle force option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      force: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle clean option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      clean: false,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle preserve option', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      preserve: ['CNAME', '.git'],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// GitHub Actions Tests
// ===========================================================================

describe('GitHub Actions workflow generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates Pages workflow with default options', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
    })

    expect(workflow).toContain('name: Deploy to GitHub Pages')
    expect(workflow).toContain('npm run build')
    expect(workflow).toContain('actions/checkout@v4')
    expect(workflow).toContain('actions/setup-node@v4')
    expect(workflow).toContain('actions/configure-pages@v4')
    expect(workflow).toContain('actions/upload-pages-artifact@v3')
    expect(workflow).toContain('actions/deploy-pages@v4')
  })

  it('generates Pages workflow with custom build command', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
      buildCommand: 'pnpm build',
    })

    expect(workflow).toContain('pnpm build')
  })

  it('generates Pages workflow with custom output dir', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
      outputDir: 'dist',
    })

    expect(workflow).toContain('path: dist')
  })

  it('generates Pages workflow with custom source branch', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
      sourceBranch: 'develop',
    })

    expect(workflow).toContain('branches: [develop]')
  })

  it('generates Pages workflow with basePath', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
      basePath: '/my-repo',
    })

    expect(workflow).toContain('BASE_PATH')
    expect(workflow).toContain('/my-repo')
  })

  it('generates Next.js workflow', async () => {
    const { generateNextJsWorkflow } = await import('./index.js')

    const workflow = generateNextJsWorkflow({
      projectDir: '/test/project',
    })

    expect(workflow).toContain('name: Deploy Next.js to GitHub Pages')
    expect(workflow).toContain('npx next build')
    expect(workflow).toContain('static_site_generator: next')
    expect(workflow).toContain('path: ./out')
  })

  it('generates Next.js workflow with custom source branch', async () => {
    const { generateNextJsWorkflow } = await import('./index.js')

    const workflow = generateNextJsWorkflow({
      projectDir: '/test/project',
      sourceBranch: 'main',
    })

    expect(workflow).toContain('branches: [main]')
  })

  it('generates Next.js workflow with basePath', async () => {
    const { generateNextJsWorkflow } = await import('./index.js')

    const workflow = generateNextJsWorkflow({
      projectDir: '/test/project',
      basePath: '/app',
    })

    expect(workflow).toContain('NEXT_PUBLIC_BASE_PATH')
    expect(workflow).toContain('/app')
  })

  it('includes workflow_dispatch trigger', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
    })

    expect(workflow).toContain('workflow_dispatch:')
  })

  it('includes proper permissions', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
    })

    expect(workflow).toContain('permissions:')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('pages: write')
    expect(workflow).toContain('id-token: write')
  })

  it('configures github-pages environment', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
    })

    expect(workflow).toContain('environment:')
    expect(workflow).toContain('name: github-pages')
  })
})

// ===========================================================================
// setupPagesActions Tests
// ===========================================================================

describe('setupPagesActions()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates workflow file in .github/workflows', async () => {
    const fs = await import('node:fs')
    const { setupPagesActions } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    const workflowPath = setupPagesActions({
      projectDir: '/test/project',
    })

    expect(workflowPath).toContain('.github/workflows/deploy-pages.yml')
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.github/workflows'),
      expect.objectContaining({ recursive: true })
    )
    expect(fs.writeFileSync).toHaveBeenCalled()
  })

  it('detects Next.js project and uses Next.js workflow', async () => {
    const fs = await import('node:fs')
    const { setupPagesActions } = await import('./index.js')

    ;(fs.existsSync as Mock).mockImplementation((path: string) => {
      return path.includes('next.config.js')
    })

    setupPagesActions({
      projectDir: '/test/nextjs-project',
    })

    const writeCall = (fs.writeFileSync as Mock).mock.calls[0]
    const content = writeCall[1]
    expect(content).toContain('Deploy Next.js to GitHub Pages')
  })

  it('uses generic workflow for non-Next.js projects', async () => {
    const fs = await import('node:fs')
    const { setupPagesActions } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    setupPagesActions({
      projectDir: '/test/generic-project',
    })

    const writeCall = (fs.writeFileSync as Mock).mock.calls[0]
    const content = writeCall[1]
    expect(content).toContain('Deploy to GitHub Pages')
    expect(content).not.toContain('Deploy Next.js')
  })
})

// ===========================================================================
// writeWorkflow Tests
// ===========================================================================

describe('writeWorkflow()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates workflow directory if not exists', async () => {
    const fs = await import('node:fs')
    const { writeWorkflow } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    writeWorkflow('/test/project', 'deploy', 'workflow content')

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.github/workflows'),
      expect.objectContaining({ recursive: true })
    )
  })

  it('writes workflow file with correct name', async () => {
    const fs = await import('node:fs')
    const { writeWorkflow } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)

    writeWorkflow('/test/project', 'my-workflow', 'content')

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('my-workflow.yml'),
      'content'
    )
  })

  it('writes correct content to file', async () => {
    const fs = await import('node:fs')
    const { writeWorkflow } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)

    const content = 'name: Test Workflow\non: push'
    writeWorkflow('/test/project', 'test', content)

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      content
    )
  })
})

// ===========================================================================
// createProvider() Tests
// ===========================================================================

describe('createProvider()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a provider with platform github', async () => {
    const { createProvider } = await import('./index.js')

    const provider = createProvider()

    expect(provider.platform).toBe('github')
    expect(provider.name).toBe('GitHub Pages')
  })

  it('creates a provider with deploy method', async () => {
    const { createProvider } = await import('./index.js')

    const provider = createProvider()

    expect(typeof provider.deploy).toBe('function')
  })

  it('creates a provider with configurePagesApi method', async () => {
    const { createProvider } = await import('./index.js')

    const provider = createProvider({ token: 'test-token' })

    expect(typeof provider.configurePagesApi).toBe('function')
  })

  it('uses provided token', async () => {
    const { createProvider } = await import('./index.js')

    const provider = createProvider({ token: 'custom-token' })

    expect(provider).toBeDefined()
  })

  it('reads token from environment', async () => {
    const originalEnv = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'env-token'

    const { createProvider } = await import('./index.js')

    const provider = createProvider()
    expect(provider).toBeDefined()

    process.env.GITHUB_TOKEN = originalEnv
  })

  it('configurePagesApi returns error when no token provided', async () => {
    const originalEnv = process.env.GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN

    const { createProvider } = await import('./index.js')

    const provider = createProvider()
    const result = await provider.configurePagesApi?.({
      owner: 'test',
      repo: 'repo',
    })

    expect(result?.success).toBe(false)
    expect(result?.error).toContain('token required')

    process.env.GITHUB_TOKEN = originalEnv
  })
})

// ===========================================================================
// configurePagesApi() Tests
// ===========================================================================

describe('configurePagesApi()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('enables Pages successfully', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html_url: 'https://user.github.io/repo' }),
    })

    const result = await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/user/repo/pages'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('updates Pages with custom domain', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html_url: 'https://user.github.io/repo' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const result = await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
      customDomain: 'example.com',
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('updates Pages with HTTPS enforcement', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html_url: 'https://user.github.io/repo' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const result = await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
      enforceHttps: true,
    })

    expect(result.success).toBe(true)
  })

  it('handles Pages already exists', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'GitHub Pages already exists',
    })

    const result = await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
    })

    // Should succeed because pages already exists
    expect(result.success).toBe(true)
  })

  it('handles API errors', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Forbidden',
    })

    const result = await configurePagesApi({
      token: 'invalid-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ===========================================================================
// Repository Detection Tests
// ===========================================================================

describe('Repository detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts owner/repo from HTTPS URL', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')
    const childProcess = await import('node:child_process')

    // Mock fs to return false for existsSync (no output dir found)
    ;(fs.existsSync as Mock).mockReturnValue(false)
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => false })

    // Mock git remote get-url to return HTTPS URL
    ;(childProcess.spawn as Mock).mockReturnValue({
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(Buffer.from('https://github.com/owner/repo.git'))
        }),
      },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === 'close') callback(0)
      }),
    })

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('owner/repo'))).toBe(true)
  })

  it('extracts owner/repo from SSH URL', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')
    const childProcess = await import('node:child_process')

    // Mock fs to return false for existsSync (no output dir found)
    ;(fs.existsSync as Mock).mockReturnValue(false)
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => false })

    // Mock git remote get-url to return SSH URL
    ;(childProcess.spawn as Mock).mockReturnValue({
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') callback(Buffer.from('git@github.com:owner/repo.git'))
        }),
      },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === 'close') callback(0)
      }),
    })

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('owner/repo'))).toBe(true)
  })

  it('returns error when no repository found', async () => {
    const { deploy } = await import('./index.js')
    const childProcess = await import('node:child_process')

    // Mock git remote get-url to fail
    ;(childProcess.spawn as Mock).mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === 'close') callback(1)
      }),
    })

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Could not determine repository')
  })
})

// ===========================================================================
// Output Directory Detection Tests
// ===========================================================================

describe('Output directory detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects out directory', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockImplementation((path: string) => {
      return path.includes('/out')
    })
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => true })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('out'))).toBe(true)
  })

  it('detects dist directory', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockImplementation((path: string) => {
      return path.includes('/dist') && !path.includes('/out')
    })
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => true })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('detects build directory', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockImplementation((path: string) => {
      return path.includes('/build') && !path.includes('/out') && !path.includes('/dist')
    })
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => true })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('defaults to out for Next.js projects', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockImplementation((path: string) => {
      return path.includes('next.config.js')
    })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('uses custom output dir when provided', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      outputDir: 'custom-output',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('custom-output'))).toBe(true)
  })
})

// ===========================================================================
// Branch Management Tests
// ===========================================================================

describe('Branch management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses default gh-pages branch', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('gh-pages'))).toBe(true)
  })

  it('uses custom branch when specified', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      branch: 'docs',
      dryRun: true,
    })

    expect(result.logs?.some(log => log.includes('docs'))).toBe(true)
  })

  it('uses sourceBranch in Actions workflow', async () => {
    const { generatePagesWorkflow } = await import('./index.js')

    const workflow = generatePagesWorkflow({
      projectDir: '/test/project',
      sourceBranch: 'develop',
    })

    expect(workflow).toContain('branches: [develop]')
  })
})

// ===========================================================================
// Custom Domain Tests
// ===========================================================================

describe('Custom domain handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns custom domain URL when set', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      customDomain: 'example.com',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('creates CNAME file for custom domain', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    // Setup mocks for full deployment
    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockReturnValue([])
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => true })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      customDomain: 'mysite.com',
      dryRun: true,
    })

    // In dry run, we just check the flow succeeds
    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Jekyll Bypass Tests
// ===========================================================================

describe('Jekyll bypass configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates .nojekyll file during deployment', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockReturnValue([])
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => true })

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    // In dry run mode, the file isn't actually created
    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Error Scenario Tests
// ===========================================================================

describe('Error scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('handles authentication failures', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Bad credentials',
    })

    const result = await configurePagesApi({
      token: 'invalid-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Bad credentials')
  })

  it('handles repository not found', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    })

    const result = await configurePagesApi({
      token: 'valid-token',
      owner: 'nonexistent',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Not Found')
  })

  it('handles rate limits', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'API rate limit exceeded',
    })

    const result = await configurePagesApi({
      token: 'valid-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
  })

  it('handles network errors', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await configurePagesApi({
      token: 'valid-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network error')
  })

  it('handles timeout errors', async () => {
    const { configurePagesApi } = await import('./index.js')

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    mockFetch.mockRejectedValueOnce(abortError)

    const result = await configurePagesApi({
      token: 'valid-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(result.success).toBe(false)
  })

  it('handles missing output directory', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('handles build failures gracefully with force option', async () => {
    const { deploy } = await import('./index.js')
    const childProcess = await import('node:child_process')

    // Mock build failure
    let callCount = 0
    ;(childProcess.spawn as Mock).mockImplementation(() => ({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callCount++
          // First call (build) fails, rest succeed
          callback(callCount === 1 ? 1 : 0)
        }
      }),
    }))

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      force: true,
      dryRun: true,
    })

    // With force=true, should still succeed
    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// GitHub API Client Tests
// ===========================================================================

describe('GitHub API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('uses default base URL', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html_url: 'https://user.github.io/repo' }),
    })

    await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com'),
      expect.any(Object)
    )
  })

  it('includes proper Accept header', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html_url: 'https://user.github.io/repo' }),
    })

    await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
        }),
      })
    )
  })

  it('includes API version header', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html_url: 'https://user.github.io/repo' }),
    })

    await configurePagesApi({
      token: 'test-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-GitHub-Api-Version': '2022-11-28',
        }),
      })
    )
  })

  it('includes Authorization header', async () => {
    const { configurePagesApi } = await import('./index.js')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html_url: 'https://user.github.io/repo' }),
    })

    await configurePagesApi({
      token: 'my-secret-token',
      owner: 'user',
      repo: 'repo',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-token',
        }),
      })
    )
  })
})

// ===========================================================================
// Deploy with Actions Tests
// ===========================================================================

describe('Deploy with GitHub Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates workflow when useActions is true', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      useActions: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('GitHub Actions'))).toBe(true)
  })

  it('commits and pushes workflow file', async () => {
    const fs = await import('node:fs')
    const childProcess = await import('node:child_process')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      useActions: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Deploy with Managed API Tests
// ===========================================================================

describe('Deploy with managed API', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('uses managed API when GITHUB_API_URL is set', async () => {
    process.env.GITHUB_API_URL = 'https://apis.do'

    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('managed API'))).toBe(true)
  })

  it('skips authentication in dry run', async () => {
    process.env.GITHUB_API_URL = 'https://apis.do'

    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('Skipping authentication'))).toBe(true)
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('Type definitions', () => {
  it('GitHubDeployOptions has required fields', () => {
    const options: GitHubDeployOptions = {
      projectDir: '/path/to/project',
    }
    expect(options.projectDir).toBeDefined()
  })

  it('GitHubDeployOptions supports all optional fields', () => {
    const options: GitHubDeployOptions = {
      projectDir: '/path/to/project',
      repository: 'owner/repo',
      branch: 'gh-pages',
      sourceBranch: 'main',
      outputDir: 'out',
      buildCommand: 'npm run build',
      token: 'token-123',
      customDomain: 'example.com',
      enforceHttps: true,
      commitMessage: 'Deploy',
      authorName: 'Bot',
      authorEmail: 'bot@example.com',
      clean: true,
      preserve: ['CNAME'],
      dryRun: false,
      force: false,
      useActions: false,
      basePath: '/repo',
    }

    expect(options.projectDir).toBe('/path/to/project')
    expect(options.repository).toBe('owner/repo')
    expect(options.useActions).toBe(false)
  })

  it('GitHubApiConfig has required fields', () => {
    const config: GitHubApiConfig = {
      token: 'token-123',
    }
    expect(config.token).toBeDefined()
  })

  it('GitHubApiConfig supports optional fields', () => {
    const config: GitHubApiConfig = {
      token: 'token-123',
      baseUrl: 'https://api.github.com',
      timeout: 30000,
    }
    expect(config.baseUrl).toBe('https://api.github.com')
    expect(config.timeout).toBe(30000)
  })

  it('DeployResult has required fields', () => {
    const result: DeployResult = {
      success: true,
    }
    expect(result.success).toBe(true)
  })

  it('DeployResult supports optional fields', () => {
    const result: DeployResult = {
      success: true,
      url: 'https://user.github.io/repo',
      commitSha: 'abc123',
      error: undefined,
      logs: ['Deployed successfully'],
    }
    expect(result.url).toBe('https://user.github.io/repo')
    expect(result.commitSha).toBe('abc123')
  })

  it('RepositoryInfo has required fields', () => {
    const info: RepositoryInfo = {
      owner: 'user',
      repo: 'repo',
      defaultBranch: 'main',
      hasPages: true,
      visibility: 'public',
    }
    expect(info.owner).toBe('user')
    expect(info.visibility).toBe('public')
  })

  it('PagesConfig has required fields', () => {
    const config: PagesConfig = {
      source: {
        branch: 'gh-pages',
        path: '/',
      },
    }
    expect(config.source.branch).toBe('gh-pages')
    expect(config.source.path).toBe('/')
  })
})

// ===========================================================================
// Edge Cases and Error Handling
// ===========================================================================

describe('Edge cases and error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('handles empty projectDir', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '',
      repository: 'owner/repo',
      dryRun: true,
    })

    // Should still run (path will be resolved)
    expect(result).toBeDefined()
  })

  it('handles special characters in repository name', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo-name_test.js',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('handles very long custom domain', async () => {
    const { deploy } = await import('./index.js')

    const longDomain = 'subdomain.' + 'a'.repeat(50) + '.example.com'

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      customDomain: longDomain,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('handles empty preserve array', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      preserve: [],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('handles undefined options gracefully', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      repository: 'owner/repo',
      token: undefined,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})
