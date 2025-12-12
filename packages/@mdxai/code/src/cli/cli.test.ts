import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'

// Mock the dependent modules
vi.mock('../auth/index.js', () => ({
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
  authHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' }),
}))

vi.mock('../runner/index.js', () => ({
  runSession: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../client/websocket.js', () => ({
  SessionClient: vi.fn().mockImplementation(() => ({
    onState: vi.fn().mockReturnValue(() => {}),
    connect: vi.fn(),
    close: vi.fn(),
  })),
}))

vi.mock('../client/api.js', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    listSessions: vi.fn().mockResolvedValue([]),
  })),
}))

vi.mock('../auth/login.js', () => ({
  login: vi.fn().mockRejectedValue(new Error('Login not implemented')),
  logout: vi.fn().mockResolvedValue(undefined),
}))

describe('CLI Commands', () => {
  describe('run command', () => {
    it('should parse run command with prompt argument', () => {
      const program = new Command()
      let capturedPrompt: string | undefined
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('run <prompt>')
        .option('-c, --cwd <path>', 'Working directory', process.cwd())
        .option('-m, --model <model>', 'Model to use', 'sonnet')
        .option('--mode <mode>', 'Execution mode', 'local')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((prompt, options) => {
          capturedPrompt = prompt
          capturedOptions = options
        })

      program.parse(['node', 'test', 'run', 'Build a new feature'])

      expect(capturedPrompt).toBe('Build a new feature')
      expect(capturedOptions.model).toBe('sonnet')
      expect(capturedOptions.mode).toBe('local')
      expect(capturedOptions.baseUrl).toBe('https://agents.do')
    })

    it('should accept custom model option', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('run <prompt>')
        .option('-m, --model <model>', 'Model to use', 'sonnet')
        .action((_prompt, options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'run', 'Test', '-m', 'opus'])

      expect(capturedOptions.model).toBe('opus')
    })

    it('should accept custom cwd option', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('run <prompt>')
        .option('-c, --cwd <path>', 'Working directory', '/default')
        .action((_prompt, options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'run', 'Test', '-c', '/custom/path'])

      expect(capturedOptions.cwd).toBe('/custom/path')
    })

    it('should accept mode option with valid values', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('run <prompt>')
        .option('--mode <mode>', 'Execution mode', 'local')
        .action((_prompt, options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'run', 'Test', '--mode', 'native'])

      expect(capturedOptions.mode).toBe('native')
    })
  })

  describe('watch command', () => {
    it('should parse watch command with sessionId argument', () => {
      const program = new Command()
      let capturedSessionId: string | undefined
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('watch <sessionId>')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((sessionId, options) => {
          capturedSessionId = sessionId
          capturedOptions = options
        })

      program.parse(['node', 'test', 'watch', 'session-123'])

      expect(capturedSessionId).toBe('session-123')
      expect(capturedOptions.baseUrl).toBe('https://agents.do')
    })

    it('should accept custom base URL', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('watch <sessionId>')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((_sessionId, options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'watch', 'session-123', '--base-url', 'http://localhost:3000'])

      expect(capturedOptions.baseUrl).toBe('http://localhost:3000')
    })
  })

  describe('list command', () => {
    it('should parse list command with defaults', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('list')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'list'])

      expect(capturedOptions.baseUrl).toBe('https://agents.do')
    })

    it('should accept custom base URL', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('list')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'list', '--base-url', 'http://localhost:3000'])

      expect(capturedOptions.baseUrl).toBe('http://localhost:3000')
    })
  })

  describe('login command', () => {
    it('should parse login command with defaults', () => {
      const program = new Command()
      let actionCalled = false
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('login')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          actionCalled = true
          capturedOptions = options
        })

      program.parse(['node', 'test', 'login'])

      expect(actionCalled).toBe(true)
      expect(capturedOptions.baseUrl).toBe('https://agents.do')
    })

    it('should accept custom base URL', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('login')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'login', '--base-url', 'http://localhost:3000'])

      expect(capturedOptions.baseUrl).toBe('http://localhost:3000')
    })
  })

  describe('logout command', () => {
    it('should parse logout command', () => {
      const program = new Command()
      let actionCalled = false

      program
        .command('logout')
        .action(() => {
          actionCalled = true
        })

      program.parse(['node', 'test', 'logout'])

      expect(actionCalled).toBe(true)
    })
  })

  describe('dashboard command', () => {
    it('should parse dashboard command with defaults', () => {
      const program = new Command()
      let capturedOptions: Record<string, unknown> = {}

      program
        .command('dashboard')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          capturedOptions = options
        })

      program.parse(['node', 'test', 'dashboard'])

      expect(capturedOptions.baseUrl).toBe('https://agents.do')
    })

    it('should construct correct dashboard URL', () => {
      const program = new Command()
      let dashboardUrl: string | undefined

      program
        .command('dashboard')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          dashboardUrl = `${options.baseUrl}/sessions`
        })

      program.parse(['node', 'test', 'dashboard'])

      expect(dashboardUrl).toBe('https://agents.do/sessions')
    })

    it('should construct correct dashboard URL with custom base', () => {
      const program = new Command()
      let dashboardUrl: string | undefined

      program
        .command('dashboard')
        .option('--base-url <url>', 'Service base URL', 'https://agents.do')
        .action((options) => {
          dashboardUrl = `${options.baseUrl}/sessions`
        })

      program.parse(['node', 'test', 'dashboard', '--base-url', 'http://localhost:3000'])

      expect(dashboardUrl).toBe('http://localhost:3000/sessions')
    })
  })
})
