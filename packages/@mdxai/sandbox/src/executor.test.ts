import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateGitUrl,
  validateBranchName,
  executeInSandbox,
  executeAndWait,
  setupSandbox,
  killSandboxProcess,
} from './executor'
import type { SandboxBinding, SandboxProcess, SandboxConfig } from './types'

// Mock SandboxBinding for testing
function createMockSandbox(overrides: Partial<SandboxBinding> = {}): SandboxBinding {
  return {
    exec: vi.fn().mockResolvedValue({
      pid: 12345,
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(0),
      kill: vi.fn().mockResolvedValue(undefined),
    } satisfies SandboxProcess),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockConfig(overrides: Partial<SandboxConfig> = {}): SandboxConfig {
  return {
    sessionId: 'test-session-123',
    prompt: 'Test prompt',
    model: 'sonnet',
    timeout: 60000,
    ...overrides,
  }
}

describe('validateGitUrl', () => {
  describe('valid HTTPS URLs', () => {
    it('accepts github.com HTTPS URL with .git suffix', () => {
      expect(() => validateGitUrl('https://github.com/user/repo.git')).not.toThrow()
    })

    it('accepts github.com HTTPS URL without .git suffix', () => {
      expect(() => validateGitUrl('https://github.com/user/repo')).not.toThrow()
    })

    it('accepts gitlab.com HTTPS URL', () => {
      expect(() => validateGitUrl('https://gitlab.com/user/repo.git')).not.toThrow()
    })

    it('accepts bitbucket.org HTTPS URL', () => {
      expect(() => validateGitUrl('https://bitbucket.org/user/repo.git')).not.toThrow()
    })

    it('accepts nested path HTTPS URL', () => {
      expect(() => validateGitUrl('https://github.com/org/group/repo.git')).not.toThrow()
    })

    it('accepts URL with hyphens and underscores', () => {
      expect(() => validateGitUrl('https://github.com/my-org/my_repo.git')).not.toThrow()
    })
  })

  describe('valid SSH URLs', () => {
    it('accepts github.com SSH URL with .git suffix', () => {
      expect(() => validateGitUrl('git@github.com:user/repo.git')).not.toThrow()
    })

    it('accepts github.com SSH URL without .git suffix', () => {
      expect(() => validateGitUrl('git@github.com:user/repo')).not.toThrow()
    })

    it('accepts gitlab.com SSH URL', () => {
      expect(() => validateGitUrl('git@gitlab.com:user/repo.git')).not.toThrow()
    })

    it('accepts nested path SSH URL', () => {
      expect(() => validateGitUrl('git@github.com:org/group/repo.git')).not.toThrow()
    })
  })

  describe('valid git:// protocol URLs', () => {
    it('accepts git:// protocol URL with .git suffix', () => {
      expect(() => validateGitUrl('git://github.com/user/repo.git')).not.toThrow()
    })

    it('accepts git:// protocol URL without .git suffix', () => {
      expect(() => validateGitUrl('git://github.com/user/repo')).not.toThrow()
    })
  })

  describe('rejects URLs with shell metacharacters', () => {
    it('rejects URL with semicolon (;)', () => {
      expect(() => validateGitUrl('https://github.com/user/repo;rm -rf /')).toThrow('contains unsafe characters')
    })

    it('rejects URL with ampersand (&)', () => {
      expect(() => validateGitUrl('https://github.com/user/repo&echo')).toThrow('contains unsafe characters')
    })

    it('rejects URL with pipe (|)', () => {
      expect(() => validateGitUrl('https://github.com/user/repo|cat')).toThrow('contains unsafe characters')
    })

    it('rejects URL with dollar sign ($)', () => {
      expect(() => validateGitUrl('https://github.com/user/$HOME')).toThrow('contains unsafe characters')
    })

    it('rejects URL with backtick (`)', () => {
      expect(() => validateGitUrl('https://github.com/user/`whoami`')).toThrow('contains unsafe characters')
    })

    it('rejects URL with parentheses', () => {
      expect(() => validateGitUrl('https://github.com/user/$(cmd)')).toThrow('contains unsafe characters')
    })

    it('rejects URL with curly braces', () => {
      expect(() => validateGitUrl('https://github.com/user/{a,b}')).toThrow('contains unsafe characters')
    })

    it('rejects URL with square brackets', () => {
      expect(() => validateGitUrl('https://github.com/user/[test]')).toThrow('contains unsafe characters')
    })

    it('rejects URL with angle brackets', () => {
      expect(() => validateGitUrl('https://github.com/user/<test>')).toThrow('contains unsafe characters')
    })

    it('rejects URL with backslash', () => {
      expect(() => validateGitUrl('https://github.com/user\\repo')).toThrow('contains unsafe characters')
    })

    it('rejects URL with single quote', () => {
      expect(() => validateGitUrl("https://github.com/user/repo'test")).toThrow('contains unsafe characters')
    })

    it('rejects URL with double quote', () => {
      expect(() => validateGitUrl('https://github.com/user/repo"test')).toThrow('contains unsafe characters')
    })

    it('rejects URL with exclamation mark', () => {
      expect(() => validateGitUrl('https://github.com/user/repo!')).toThrow('contains unsafe characters')
    })

    it('rejects URL with newline', () => {
      expect(() => validateGitUrl('https://github.com/user/repo\necho hacked')).toThrow('contains unsafe characters')
    })
  })

  describe('rejects invalid URL formats', () => {
    it('rejects HTTP URL (non-HTTPS)', () => {
      expect(() => validateGitUrl('http://github.com/user/repo.git')).toThrow('Invalid git URL format')
    })

    it('rejects file:// URL', () => {
      expect(() => validateGitUrl('file:///path/to/repo.git')).toThrow('Invalid git URL format')
    })

    it('rejects URL without path', () => {
      expect(() => validateGitUrl('https://github.com')).toThrow('Invalid git URL format')
    })

    it('rejects empty string', () => {
      expect(() => validateGitUrl('')).toThrow('Invalid git URL format')
    })

    it('rejects plain string', () => {
      expect(() => validateGitUrl('not-a-url')).toThrow('Invalid git URL format')
    })
  })
})

describe('validateBranchName', () => {
  describe('valid branch names', () => {
    it('accepts simple branch name', () => {
      expect(() => validateBranchName('main')).not.toThrow()
    })

    it('accepts branch name with hyphen', () => {
      expect(() => validateBranchName('feature-branch')).not.toThrow()
    })

    it('accepts branch name with underscore', () => {
      expect(() => validateBranchName('feature_branch')).not.toThrow()
    })

    it('accepts branch name with dot', () => {
      expect(() => validateBranchName('release.1.0')).not.toThrow()
    })

    it('accepts hierarchical branch name', () => {
      expect(() => validateBranchName('feature/my-feature')).not.toThrow()
    })

    it('accepts deeply nested branch name', () => {
      expect(() => validateBranchName('feature/area/subarea/task')).not.toThrow()
    })

    it('accepts single character branch name', () => {
      expect(() => validateBranchName('m')).not.toThrow()
    })

    it('accepts numeric branch name', () => {
      expect(() => validateBranchName('v123')).not.toThrow()
    })
  })

  describe('rejects branch names with shell metacharacters', () => {
    it('rejects branch name with semicolon (;)', () => {
      expect(() => validateBranchName('main;rm -rf')).toThrow('contains unsafe characters')
    })

    it('rejects branch name with ampersand (&)', () => {
      expect(() => validateBranchName('main&echo')).toThrow('contains unsafe characters')
    })

    it('rejects branch name with pipe (|)', () => {
      expect(() => validateBranchName('main|cat')).toThrow('contains unsafe characters')
    })

    it('rejects branch name with dollar sign ($)', () => {
      expect(() => validateBranchName('$HOME')).toThrow('contains unsafe characters')
    })

    it('rejects branch name with backtick (`)', () => {
      expect(() => validateBranchName('`whoami`')).toThrow('contains unsafe characters')
    })

    it('rejects branch name with newline', () => {
      expect(() => validateBranchName('main\necho hacked')).toThrow('contains unsafe characters')
    })
  })

  describe('rejects invalid branch name formats', () => {
    it('rejects branch name starting with hyphen', () => {
      expect(() => validateBranchName('-branch')).toThrow('Invalid branch name format')
    })

    it('rejects branch name ending with hyphen', () => {
      expect(() => validateBranchName('branch-')).toThrow('Invalid branch name format')
    })

    it('rejects branch name starting with dot', () => {
      expect(() => validateBranchName('.hidden')).toThrow('Invalid branch name format')
    })

    it('rejects branch name ending with dot', () => {
      expect(() => validateBranchName('branch.')).toThrow('Invalid branch name format')
    })

    it('rejects empty branch name', () => {
      expect(() => validateBranchName('')).toThrow('Invalid branch name format')
    })
  })
})

describe('executeInSandbox', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('executes with minimal config (no repo)', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig()

    const proc = await executeInSandbox(sandbox, config)

    expect(proc.pid).toBe(12345)
    expect(sandbox.mkdir).toHaveBeenCalledWith('/workspace', { recursive: true })
    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.stringContaining('pnpm claude'),
      expect.objectContaining({
        cwd: '/workspace',
        stream: true,
      })
    )
  })

  it('clones repository when repo is specified', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      repo: 'https://github.com/user/repo.git',
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      'git clone https://github.com/user/repo.git /workspace',
      { timeout: 60000 }
    )
  })

  it('checks out branch when specified', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      repo: 'https://github.com/user/repo.git',
      branch: 'feature-branch',
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      'git clone https://github.com/user/repo.git /workspace',
      { timeout: 60000 }
    )
    expect(sandbox.exec).toHaveBeenCalledWith(
      'git checkout feature-branch',
      { cwd: '/workspace', timeout: 10000 }
    )
  })

  it('writes initial files when specified', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      files: {
        'test.ts': 'console.log("test")',
        'README.md': '# Test',
      },
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.writeFile).toHaveBeenCalledWith('/workspace/test.ts', 'console.log("test")')
    expect(sandbox.writeFile).toHaveBeenCalledWith('/workspace/README.md', '# Test')
  })

  it('uses custom working directory when cwd is specified', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      cwd: 'packages/core',
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.stringContaining('pnpm claude'),
      expect.objectContaining({
        cwd: '/workspace/packages/core',
      })
    )
  })

  it('passes environment variables', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      env: {
        ANTHROPIC_API_KEY: 'test-api-key',
        CUSTOM_VAR: 'custom-value',
      },
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_API_KEY: 'test-api-key',
          CUSTOM_VAR: 'custom-value',
        }),
      })
    )
  })

  it('uses specified model in command', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      model: 'opus',
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.stringContaining('--model opus'),
      expect.any(Object)
    )
  })

  it('escapes quotes in prompt', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      prompt: 'Fix the "bug" in main.ts',
    })

    await executeInSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.stringContaining('Fix the \\"bug\\" in main.ts'),
      expect.any(Object)
    )
  })

  it('validates git URL before cloning', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      repo: 'https://github.com/user/repo;rm -rf /',
    })

    await expect(executeInSandbox(sandbox, config)).rejects.toThrow('contains unsafe characters')
    expect(sandbox.exec).not.toHaveBeenCalled()
  })

  it('validates branch name before checkout', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig({
      repo: 'https://github.com/user/repo.git',
      branch: 'main;rm -rf /',
    })

    await expect(executeInSandbox(sandbox, config)).rejects.toThrow('contains unsafe characters')
  })
})

describe('executeAndWait', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('returns successful result with exit code 0', async () => {
    const sandbox = createMockSandbox()
    const config = createMockConfig()

    const result = await executeAndWait(sandbox, config)

    expect(result.sessionId).toBe('test-session-123')
    expect(result.exitCode).toBe(0)
    expect(result.startedAt).toBeInstanceOf(Date)
    expect(result.completedAt).toBeInstanceOf(Date)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
  })

  it('returns result with non-zero exit code', async () => {
    const sandbox = createMockSandbox({
      exec: vi.fn().mockResolvedValue({
        pid: 12345,
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
        exitCode: Promise.resolve(1),
        kill: vi.fn(),
      }),
    })
    const config = createMockConfig()

    const result = await executeAndWait(sandbox, config)

    expect(result.exitCode).toBe(1)
    expect(result.error).toBeUndefined()
  })

  it('handles execution errors gracefully', async () => {
    const sandbox = createMockSandbox({
      exec: vi.fn().mockRejectedValue(new Error('Sandbox execution failed')),
    })
    const config = createMockConfig()

    const result = await executeAndWait(sandbox, config)

    expect(result.exitCode).toBe(1)
    expect(result.error).toBe('Sandbox execution failed')
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('handles non-Error exceptions', async () => {
    const sandbox = createMockSandbox({
      exec: vi.fn().mockRejectedValue('String error'),
    })
    const config = createMockConfig()

    const result = await executeAndWait(sandbox, config)

    expect(result.exitCode).toBe(1)
    expect(result.error).toBe('String error')
  })
})

describe('setupSandbox', () => {
  it('clones repository when specified', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      repo: 'https://github.com/user/repo.git',
      model: 'sonnet',
      timeout: 60000,
    }

    await setupSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      'git clone https://github.com/user/repo.git /workspace',
      { timeout: 60000 }
    )
  })

  it('checks out branch when specified', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      repo: 'https://github.com/user/repo.git',
      branch: 'develop',
      model: 'sonnet',
      timeout: 60000,
    }

    await setupSandbox(sandbox, config)

    expect(sandbox.exec).toHaveBeenCalledWith(
      'git checkout develop',
      { cwd: '/workspace', timeout: 10000 }
    )
  })

  it('creates workspace directory when no repo specified', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      model: 'sonnet',
      timeout: 60000,
    }

    await setupSandbox(sandbox, config)

    expect(sandbox.mkdir).toHaveBeenCalledWith('/workspace', { recursive: true })
    expect(sandbox.exec).not.toHaveBeenCalled()
  })

  it('writes initial files', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      model: 'sonnet',
      timeout: 60000,
      files: {
        'src/index.ts': 'export {}',
        'package.json': '{}',
      },
    }

    await setupSandbox(sandbox, config)

    expect(sandbox.writeFile).toHaveBeenCalledWith('/workspace/src/index.ts', 'export {}')
    expect(sandbox.writeFile).toHaveBeenCalledWith('/workspace/package.json', '{}')
  })

  it('validates git URL', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      repo: 'invalid-url',
      model: 'sonnet',
      timeout: 60000,
    }

    await expect(setupSandbox(sandbox, config)).rejects.toThrow('Invalid git URL format')
  })

  it('validates branch name', async () => {
    const sandbox = createMockSandbox()
    const config = {
      sessionId: 'test-session',
      repo: 'https://github.com/user/repo.git',
      branch: 'bad;branch',
      model: 'sonnet',
      timeout: 60000,
    }

    await expect(setupSandbox(sandbox, config)).rejects.toThrow('contains unsafe characters')
  })
})

describe('killSandboxProcess', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('calls kill on the process', async () => {
    const killFn = vi.fn().mockResolvedValue(undefined)
    const proc: SandboxProcess = {
      pid: 12345,
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(0),
      kill: killFn,
    }

    await killSandboxProcess(proc)

    expect(killFn).toHaveBeenCalled()
  })

  it('logs the kill action', async () => {
    const proc: SandboxProcess = {
      pid: 99999,
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(0),
      kill: vi.fn().mockResolvedValue(undefined),
    }

    await killSandboxProcess(proc)

    expect(consoleSpy).toHaveBeenCalledWith('Killing sandbox process: PID 99999')
  })
})
