import { describe, it, expect } from 'vitest'
import {
  SandboxConfigSchema,
  StreamEventSchema,
  type SandboxConfig,
  type SandboxProcess,
  type SandboxResult,
  type StreamEvent,
  type SandboxBinding,
  type ExecOptions,
} from './types'

/**
 * Zod Schema Runtime Validation Tests
 *
 * These tests verify the runtime validation behavior of Zod schemas.
 * They are valuable because they test actual parsing/validation logic
 * that runs at runtime when receiving data from external sources.
 */
describe('SandboxConfigSchema', () => {
  describe('required fields', () => {
    it('requires sessionId', () => {
      const result = SandboxConfigSchema.safeParse({
        prompt: 'Test prompt',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('sessionId')
      }
    })

    it('requires prompt', () => {
      const result = SandboxConfigSchema.safeParse({
        sessionId: 'test-123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('prompt')
      }
    })
  })

  describe('default values', () => {
    it('defaults model to sonnet', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
      })

      expect(result.model).toBe('sonnet')
    })

    it('defaults timeout to 600000', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
      })

      expect(result.timeout).toBe(600000)
    })
  })

  describe('optional fields', () => {
    it('accepts repo URL', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        repo: 'https://github.com/user/repo',
      })

      expect(result.repo).toBe('https://github.com/user/repo')
    })

    it('accepts branch name', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        branch: 'main',
      })

      expect(result.branch).toBe('main')
    })

    it('accepts cwd', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        cwd: 'packages/core',
      })

      expect(result.cwd).toBe('packages/core')
    })

    it('accepts files record', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        files: {
          'index.ts': 'export {}',
          'package.json': '{}',
        },
      })

      expect(result.files).toEqual({
        'index.ts': 'export {}',
        'package.json': '{}',
      })
    })

    it('accepts env record', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        env: {
          NODE_ENV: 'test',
          API_KEY: 'secret',
        },
      })

      expect(result.env).toEqual({
        NODE_ENV: 'test',
        API_KEY: 'secret',
      })
    })
  })

  describe('validation', () => {
    it('validates repo as URL format', () => {
      const result = SandboxConfigSchema.safeParse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        repo: 'not-a-url',
      })

      expect(result.success).toBe(false)
    })

    it('allows custom model', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        model: 'opus',
      })

      expect(result.model).toBe('opus')
    })

    it('allows custom timeout', () => {
      const result = SandboxConfigSchema.parse({
        sessionId: 'test-123',
        prompt: 'Test prompt',
        timeout: 30000,
      })

      expect(result.timeout).toBe(30000)
    })
  })

  describe('full config', () => {
    it('parses complete config', () => {
      const config = {
        sessionId: 'session-abc-123',
        prompt: 'Fix the bug in main.ts',
        repo: 'https://github.com/user/repo.git',
        branch: 'feature/fix-bug',
        cwd: 'packages/core',
        model: 'opus',
        files: {
          '.env': 'API_KEY=test',
        },
        env: {
          ANTHROPIC_API_KEY: 'sk-test',
        },
        timeout: 120000,
      }

      const result = SandboxConfigSchema.parse(config)

      expect(result).toEqual(config)
    })
  })
})

describe('StreamEventSchema', () => {
  describe('assistant events', () => {
    it('parses valid assistant event', () => {
      const event = { type: 'assistant', content: 'Hello, world!' }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('requires content field', () => {
      const result = StreamEventSchema.safeParse({ type: 'assistant' })

      expect(result.success).toBe(false)
    })

    it('requires content to be string', () => {
      const result = StreamEventSchema.safeParse({
        type: 'assistant',
        content: 123,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('tool_use events', () => {
    it('parses valid tool_use event', () => {
      const event = {
        type: 'tool_use',
        tool: 'Read',
        input: { file_path: '/test.ts' },
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('requires tool field', () => {
      const result = StreamEventSchema.safeParse({
        type: 'tool_use',
        input: {},
      })

      expect(result.success).toBe(false)
    })

    it('allows any input type', () => {
      const events = [
        { type: 'tool_use', tool: 'Test', input: 'string' },
        { type: 'tool_use', tool: 'Test', input: 123 },
        { type: 'tool_use', tool: 'Test', input: null },
        { type: 'tool_use', tool: 'Test', input: ['array'] },
        { type: 'tool_use', tool: 'Test', input: { nested: { deep: true } } },
      ]

      for (const event of events) {
        const result = StreamEventSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('tool_result events', () => {
    it('parses valid tool_result event with tool_use_id', () => {
      const event = {
        type: 'tool_result',
        tool_use_id: 'tool_123',
        output: 'result data',
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses tool_result without tool_use_id', () => {
      const event = {
        type: 'tool_result',
        output: 'result data',
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('allows any output type', () => {
      const events = [
        { type: 'tool_result', output: 'string' },
        { type: 'tool_result', output: 123 },
        { type: 'tool_result', output: null },
        { type: 'tool_result', output: { success: true } },
      ]

      for (const event of events) {
        const result = StreamEventSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('result events', () => {
    it('parses result event with full usage', () => {
      const event = {
        type: 'result',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 100,
        },
        stop_reason: 'end_turn',
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses result event with minimal usage', () => {
      const event = {
        type: 'result',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses result event without usage', () => {
      const event = { type: 'result' }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses result event with only stop_reason', () => {
      const event = { type: 'result', stop_reason: 'max_tokens' }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('requires input_tokens in usage if usage provided', () => {
      const result = StreamEventSchema.safeParse({
        type: 'result',
        usage: { output_tokens: 100 },
      })

      expect(result.success).toBe(false)
    })

    it('requires output_tokens in usage if usage provided', () => {
      const result = StreamEventSchema.safeParse({
        type: 'result',
        usage: { input_tokens: 100 },
      })

      expect(result.success).toBe(false)
    })
  })

  describe('error events', () => {
    it('parses error event with message', () => {
      const event = {
        type: 'error',
        error: 'Something went wrong',
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses error event with details', () => {
      const event = {
        type: 'error',
        error: 'API Error',
        details: { code: 500, stack: 'Error: ...' },
      }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('requires error field', () => {
      const result = StreamEventSchema.safeParse({
        type: 'error',
        details: {},
      })

      expect(result.success).toBe(false)
    })
  })

  describe('complete events', () => {
    it('parses complete event with exitCode 0', () => {
      const event = { type: 'complete', exitCode: 0 }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('parses complete event with non-zero exitCode', () => {
      const event = { type: 'complete', exitCode: 1 }
      const result = StreamEventSchema.parse(event)

      expect(result).toEqual(event)
    })

    it('requires exitCode field', () => {
      const result = StreamEventSchema.safeParse({ type: 'complete' })

      expect(result.success).toBe(false)
    })

    it('requires exitCode to be number', () => {
      const result = StreamEventSchema.safeParse({
        type: 'complete',
        exitCode: '0',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('unknown event types', () => {
    it('rejects unknown event type', () => {
      const result = StreamEventSchema.safeParse({
        type: 'unknown',
        data: 'test',
      })

      expect(result.success).toBe(false)
    })

    it('rejects event without type', () => {
      const result = StreamEventSchema.safeParse({
        content: 'test',
      })

      expect(result.success).toBe(false)
    })
  })
})

/**
 * TypeScript Interface Type Guard Tests
 *
 * These tests verify that TypeScript interfaces are correctly defined and
 * can be used at runtime. While TypeScript compilation catches type errors,
 * these tests serve as documentation and verify runtime behavior when
 * constructing objects that implement these interfaces.
 *
 * These are kept intentionally minimal - they verify structural contracts
 * without testing trivial behavior.
 */

describe('StreamEvent discriminated union', () => {
  it('can be narrowed by type field for exhaustive handling', () => {
    // This test verifies the discriminated union pattern works correctly
    // at runtime for event processing logic
    function processEvent(event: StreamEvent): string {
      switch (event.type) {
        case 'assistant':
          return `Assistant: ${event.content}`
        case 'tool_use':
          return `Tool: ${event.tool}`
        case 'tool_result':
          return `Result: ${JSON.stringify(event.output)}`
        case 'result':
          return `Done: ${event.stop_reason ?? 'unknown'}`
        case 'error':
          return `Error: ${event.error}`
        case 'complete':
          return `Exit: ${event.exitCode}`
      }
    }

    expect(processEvent({ type: 'assistant', content: 'Hi' })).toBe('Assistant: Hi')
    expect(processEvent({ type: 'tool_use', tool: 'Read', input: {} })).toBe('Tool: Read')
    expect(processEvent({ type: 'complete', exitCode: 0 })).toBe('Exit: 0')
    expect(processEvent({ type: 'error', error: 'Failed' })).toBe('Error: Failed')
    expect(processEvent({ type: 'result', stop_reason: 'end_turn' })).toBe('Done: end_turn')
  })
})

describe('SandboxProcess interface', () => {
  it('exitCode promise resolves correctly', async () => {
    // This test verifies the async nature of exitCode works as expected
    const process: SandboxProcess = {
      pid: 1,
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(42),
      kill: async () => {},
    }

    const code = await process.exitCode
    expect(code).toBe(42)
  })
})
