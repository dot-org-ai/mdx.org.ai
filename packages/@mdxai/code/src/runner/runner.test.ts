import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseStreamJson, parseStreamLines } from './parser.js'
import { EventReporter } from './reporter.js'
import { buildClaudeArgs } from './spawn.js'

describe('Runner Module', () => {
  describe('parseStreamJson', () => {
    it('should parse valid JSON', () => {
      const line = '{"type":"assistant","content":"Hello"}'
      const result = parseStreamJson(line)

      expect(result).toBeDefined()
      expect(result?.type).toBe('assistant')
      expect(result?.data).toEqual({ type: 'assistant', content: 'Hello' })
    })

    it('should return null for invalid JSON', () => {
      const line = 'not json'
      const result = parseStreamJson(line)

      expect(result).toBeNull()
    })

    it('should return null for empty lines', () => {
      const result = parseStreamJson('')
      expect(result).toBeNull()
    })

    it('should return null for whitespace-only lines', () => {
      const result = parseStreamJson('   \t  ')
      expect(result).toBeNull()
    })

    it('should include timestamp in parsed event', () => {
      const line = '{"type":"tool_use","tool":"Read"}'
      const before = new Date()
      const result = parseStreamJson(line)
      const after = new Date()

      expect(result?.timestamp).toBeDefined()
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should parse tool_result events', () => {
      const line = '{"type":"tool_result","result":"success","content":"file contents"}'
      const result = parseStreamJson(line)

      expect(result?.type).toBe('tool_result')
      expect(result?.data).toEqual({
        type: 'tool_result',
        result: 'success',
        content: 'file contents',
      })
    })

    it('should parse result events', () => {
      const line = '{"type":"result","cost":0.05,"duration":5000}'
      const result = parseStreamJson(line)

      expect(result?.type).toBe('result')
      expect(result?.data).toEqual({
        type: 'result',
        cost: 0.05,
        duration: 5000,
      })
    })
  })

  describe('parseStreamLines', () => {
    it('should yield events for multiple lines', () => {
      const chunk = '{"type":"assistant","content":"Hello"}\n{"type":"tool_use","tool":"Read"}'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(2)
      expect(events[0]?.type).toBe('assistant')
      expect(events[1]?.type).toBe('tool_use')
    })

    it('should filter empty lines', () => {
      const chunk = '{"type":"assistant"}\n\n\n{"type":"tool_use"}'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(2)
    })

    it('should handle single line chunk', () => {
      const chunk = '{"type":"assistant","content":"Hello"}'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('assistant')
    })

    it('should skip invalid JSON lines', () => {
      const chunk = '{"type":"assistant"}\nnot json\n{"type":"tool_use"}'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(2)
      expect(events[0]?.type).toBe('assistant')
      expect(events[1]?.type).toBe('tool_use')
    })

    it('should handle trailing newline', () => {
      const chunk = '{"type":"assistant"}\n'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(1)
    })

    it('should handle empty chunk', () => {
      const chunk = ''
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(0)
    })

    it('should handle chunk with only newlines', () => {
      const chunk = '\n\n\n'
      const events = [...parseStreamLines(chunk)]

      expect(events).toHaveLength(0)
    })
  })

  describe('buildClaudeArgs', () => {
    it('should build correct base arguments', () => {
      const args = buildClaudeArgs({
        prompt: 'Build a feature',
        model: 'sonnet',
      })

      expect(args).toContain('claude')
      expect(args).toContain('--output-format')
      expect(args).toContain('stream-json')
      expect(args).toContain('--print')
      expect(args).toContain('assistant,result,tool_use,tool_result')
      expect(args).toContain('-p')
      expect(args).toContain('Build a feature')
    })

    it('should include specified model', () => {
      const args = buildClaudeArgs({
        prompt: 'Test prompt',
        model: 'sonnet',
      })

      expect(args).toContain('--model')
      expect(args).toContain('sonnet')
    })

    it('should default model to sonnet when not specified', () => {
      const args = buildClaudeArgs({
        prompt: 'Test prompt',
      })

      expect(args).toContain('--model')
      expect(args).toContain('sonnet')
    })

    it('should support opus model', () => {
      const args = buildClaudeArgs({
        prompt: 'Test prompt',
        model: 'opus',
      })

      expect(args).toContain('--model')
      expect(args).toContain('opus')
    })

    it('should support haiku model', () => {
      const args = buildClaudeArgs({
        prompt: 'Test prompt',
        model: 'haiku',
      })

      expect(args).toContain('--model')
      expect(args).toContain('haiku')
    })

    it('should include prompt at end of arguments', () => {
      const args = buildClaudeArgs({
        prompt: 'Test prompt',
      })

      const promptIndex = args.indexOf('-p')
      expect(promptIndex).toBeGreaterThan(-1)
      expect(args[promptIndex + 1]).toBe('Test prompt')
    })

    it('should preserve prompt content exactly', () => {
      const testPrompt = 'Fix the bug in "main.ts" file'
      const args = buildClaudeArgs({
        prompt: testPrompt,
      })

      expect(args).toContain(testPrompt)
    })

    it('should return correct number of arguments', () => {
      const args = buildClaudeArgs({
        prompt: 'Test',
      })

      // claude, --output-format, stream-json, --print, events, --model, sonnet, -p, prompt
      expect(args).toHaveLength(9)
    })
  })

  describe('EventReporter', () => {
    beforeEach(() => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}', { status: 200 }))
    })

    it('should POST events to service URL', async () => {
      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      await reporter.send({
        type: 'assistant',
        data: { content: 'Hello' },
        timestamp: new Date(),
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://agents.do/sessions/session-123/event',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should include auth headers', async () => {
      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      await reporter.send({
        type: 'assistant',
        data: {},
        timestamp: new Date(),
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('should include Content-Type header', async () => {
      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      await reporter.send({
        type: 'assistant',
        data: {},
        timestamp: new Date(),
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'))

      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      // Should not throw
      await expect(
        reporter.send({
          type: 'assistant',
          data: {},
          timestamp: new Date(),
        })
      ).resolves.toBeUndefined()
    })

    it('should send complete event with exit code', async () => {
      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      await reporter.sendComplete(0)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"complete"'),
        })
      )
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"code":0'),
        })
      )
    })

    it('should send error event with message and stack', async () => {
      const reporter = new EventReporter({
        sessionId: 'session-123',
        baseUrl: 'https://agents.do',
        authToken: 'test-token',
      })

      const error = new Error('Test error')
      await reporter.sendError(error)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"error"'),
        })
      )
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"message":"Test error"'),
        })
      )
    })
  })
})
