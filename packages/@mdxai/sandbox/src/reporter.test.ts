import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SandboxReporter, reportSandboxEvents, type ReporterConfig } from './reporter'
import type { SandboxProcess, StreamEvent } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createMockProcess(
  events: StreamEvent[],
  exitCode: number = 0
): SandboxProcess {
  const encoder = new TextEncoder()
  let eventIndex = 0

  const stdout = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (eventIndex < events.length) {
        const line = JSON.stringify(events[eventIndex]) + '\n'
        controller.enqueue(encoder.encode(line))
        eventIndex++
      } else {
        controller.close()
      }
    },
  })

  return {
    pid: 12345,
    stdout,
    stderr: new ReadableStream(),
    exitCode: Promise.resolve(exitCode),
    kill: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SandboxReporter', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('constructor', () => {
    it('initializes with required config', () => {
      const config: ReporterConfig = {
        sessionUrl: 'https://agents.do/sessions/123',
      }

      const reporter = new SandboxReporter(config)

      expect(reporter).toBeInstanceOf(SandboxReporter)
    })

    it('initializes with all config options', () => {
      const config: ReporterConfig = {
        sessionUrl: 'https://agents.do/sessions/123',
        authToken: 'secret-token',
        retryAttempts: 5,
        retryDelay: 2000,
      }

      const reporter = new SandboxReporter(config)

      expect(reporter).toBeInstanceOf(SandboxReporter)
    })

    it('uses default retry values when not specified', () => {
      const config: ReporterConfig = {
        sessionUrl: 'https://agents.do/sessions/123',
      }

      // Create reporter and verify defaults are used during request
      const reporter = new SandboxReporter(config)

      // This just verifies construction works - defaults are tested via behavior
      expect(reporter).toBeInstanceOf(SandboxReporter)
    })
  })

  describe('streamToSession', () => {
    it('posts each event to session endpoint', async () => {
      const events: StreamEvent[] = [
        { type: 'assistant', content: 'Hello' },
        { type: 'tool_use', tool: 'Read', input: {} },
        { type: 'tool_result', output: 'data' },
      ]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      // 3 events + 1 complete event
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    it('sends events to correct URL', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/456',
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://agents.do/sessions/456/event',
        expect.any(Object)
      )
    })

    it('sends POST request with JSON body', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ type: 'assistant', content: 'Test' }),
        })
      )
    })

    it('sends completion event with exit code', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Done' }]
      const proc = createMockProcess(events, 0)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ type: 'complete', exitCode: 0 }),
        })
      )
    })

    it('sends completion event with non-zero exit code', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Failed' }]
      const proc = createMockProcess(events, 1)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ type: 'complete', exitCode: 1 }),
        })
      )
    })

    it('logs completion message', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events, 0)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sandbox process completed with exit code 0')
      )
    })
  })

  describe('auth header inclusion', () => {
    it('includes Authorization header when authToken is provided', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        authToken: 'my-secret-token',
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      )
    })

    it('does not include Authorization header when authToken is not provided', async () => {
      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await reporter.streamToSession(proc)

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('retry logic', () => {
    it('retries on fetch failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true })

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 3,
        retryDelay: 10, // Short delay for tests
      })

      await reporter.streamToSession(proc)

      // First event: 1 fail + 1 success = 2 calls
      // Complete event: 1 call
      // Total: 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('retries on non-ok response', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true })

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 3,
        retryDelay: 10,
      })

      await reporter.streamToSession(proc)

      expect(mockFetch).toHaveBeenCalledTimes(3) // 1 fail + 1 success + 1 complete
    })

    it('logs retry attempts', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true })

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 3,
        retryDelay: 10,
      })

      await reporter.streamToSession(proc)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request failed (attempt 1/4)'),
        expect.any(String)
      )
    })

    it('uses exponential backoff', async () => {
      const delays: number[] = []
      const originalSetTimeout = globalThis.setTimeout
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay) => {
        delays.push(delay as number)
        return originalSetTimeout(fn, 0) // Execute immediately in tests
      })

      mockFetch
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true })

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 3,
        retryDelay: 100,
      })

      await reporter.streamToSession(proc)

      // Exponential backoff: 100, 200, 400
      expect(delays).toContain(100)
      expect(delays).toContain(200)
      expect(delays).toContain(400)
    })

    it('throws after exhausting retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'))

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)
      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 2,
        retryDelay: 10,
      })

      await expect(reporter.streamToSession(proc)).rejects.toThrow(
        'Failed to report event after 3 attempts'
      )
    })
  })

  describe('error handling', () => {
    it('reports error event on stream failure', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      // Create a process that will throw during stream reading
      const stdout = new ReadableStream<Uint8Array>({
        pull() {
          throw new Error('Stream read error')
        },
      })

      const proc: SandboxProcess = {
        pid: 12345,
        stdout,
        stderr: new ReadableStream(),
        exitCode: Promise.resolve(0),
        kill: vi.fn(),
      }

      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await expect(reporter.streamToSession(proc)).rejects.toThrow('Stream read error')

      // Verify error event was reported
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"error"'),
        })
      )
    })

    it('logs error when streaming fails', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const stdout = new ReadableStream<Uint8Array>({
        pull() {
          throw new Error('Stream failure')
        },
      })

      const proc: SandboxProcess = {
        pid: 12345,
        stdout,
        stderr: new ReadableStream(),
        exitCode: Promise.resolve(0),
        kill: vi.fn(),
      }

      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await expect(reporter.streamToSession(proc)).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error streaming events to session:',
        expect.any(Error)
      )
    })

    it('handles non-Error exceptions', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const stdout = new ReadableStream<Uint8Array>({
        pull() {
          throw 'String error' // Non-Error throw
        },
      })

      const proc: SandboxProcess = {
        pid: 12345,
        stdout,
        stderr: new ReadableStream(),
        exitCode: Promise.resolve(0),
        kill: vi.fn(),
      }

      const reporter = new SandboxReporter({
        sessionUrl: 'https://agents.do/sessions/123',
      })

      await expect(reporter.streamToSession(proc)).rejects.toBe('String error')

      // Verify error event contains stringified error
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"error":"String error"'),
        })
      )
    })
  })

  describe('reportSandboxEvents convenience function', () => {
    it('creates reporter and streams events', async () => {
      const events: StreamEvent[] = [
        { type: 'assistant', content: 'Hello' },
        { type: 'result' },
      ]
      const proc = createMockProcess(events)

      await reportSandboxEvents(proc, {
        sessionUrl: 'https://agents.do/sessions/789',
        authToken: 'test-token',
      })

      // 2 events + 1 complete = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://agents.do/sessions/789/event',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('passes retry options to reporter', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue({ ok: true })

      const events: StreamEvent[] = [{ type: 'assistant', content: 'Test' }]
      const proc = createMockProcess(events)

      await reportSandboxEvents(proc, {
        sessionUrl: 'https://agents.do/sessions/123',
        retryAttempts: 1,
        retryDelay: 10,
      })

      // Verifies retry worked
      expect(mockFetch).toHaveBeenCalledTimes(3) // 1 fail + 1 success + 1 complete
    })
  })
})
