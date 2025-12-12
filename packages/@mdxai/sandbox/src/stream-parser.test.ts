import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseStreamJson,
  parseStreamJsonLines,
  streamEvents,
  summarizeStreamEvents,
} from './stream-parser'
import type { StreamEvent } from './types'

describe('parseStreamJson', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('valid assistant events', () => {
    it('parses assistant event with content', () => {
      const line = JSON.stringify({ type: 'assistant', content: 'Hello, world!' })
      const result = parseStreamJson(line)

      expect(result).toEqual({ type: 'assistant', content: 'Hello, world!' })
    })

    it('parses assistant event with empty content', () => {
      const line = JSON.stringify({ type: 'assistant', content: '' })
      const result = parseStreamJson(line)

      expect(result).toEqual({ type: 'assistant', content: '' })
    })

    it('parses assistant event with multiline content', () => {
      const line = JSON.stringify({ type: 'assistant', content: 'Line 1\nLine 2\nLine 3' })
      const result = parseStreamJson(line)

      expect(result).toEqual({ type: 'assistant', content: 'Line 1\nLine 2\nLine 3' })
    })
  })

  describe('valid tool_use events', () => {
    it('parses tool_use event with simple input', () => {
      const line = JSON.stringify({
        type: 'tool_use',
        tool: 'Read',
        input: { file_path: '/test.ts' },
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_use',
        tool: 'Read',
        input: { file_path: '/test.ts' },
      })
    })

    it('parses tool_use event with complex input', () => {
      const line = JSON.stringify({
        type: 'tool_use',
        tool: 'Bash',
        input: {
          command: 'npm test',
          timeout: 30000,
          env: { NODE_ENV: 'test' },
        },
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_use',
        tool: 'Bash',
        input: {
          command: 'npm test',
          timeout: 30000,
          env: { NODE_ENV: 'test' },
        },
      })
    })

    it('parses tool_use event with null input', () => {
      const line = JSON.stringify({
        type: 'tool_use',
        tool: 'GetTime',
        input: null,
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_use',
        tool: 'GetTime',
        input: null,
      })
    })
  })

  describe('valid tool_result events', () => {
    it('parses tool_result event with string output', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        tool_use_id: 'tool_123',
        output: 'File contents here',
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_result',
        tool_use_id: 'tool_123',
        output: 'File contents here',
      })
    })

    it('parses tool_result event with object output', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        tool_use_id: 'tool_456',
        output: { success: true, files: ['a.ts', 'b.ts'] },
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_result',
        tool_use_id: 'tool_456',
        output: { success: true, files: ['a.ts', 'b.ts'] },
      })
    })

    it('parses tool_result event without tool_use_id', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        output: 'Some output',
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'tool_result',
        output: 'Some output',
      })
    })
  })

  describe('valid result events', () => {
    it('parses result event with full usage data', () => {
      const line = JSON.stringify({
        type: 'result',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 100,
        },
        stop_reason: 'end_turn',
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'result',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 100,
        },
        stop_reason: 'end_turn',
      })
    })

    it('parses result event with minimal usage data', () => {
      const line = JSON.stringify({
        type: 'result',
        usage: {
          input_tokens: 500,
          output_tokens: 250,
        },
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'result',
        usage: {
          input_tokens: 500,
          output_tokens: 250,
        },
      })
    })

    it('parses result event without usage', () => {
      const line = JSON.stringify({
        type: 'result',
        stop_reason: 'max_tokens',
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'result',
        stop_reason: 'max_tokens',
      })
    })

    it('parses result event with empty object', () => {
      const line = JSON.stringify({ type: 'result' })
      const result = parseStreamJson(line)

      expect(result).toEqual({ type: 'result' })
    })
  })

  describe('valid error events', () => {
    it('parses error event with message only', () => {
      const line = JSON.stringify({
        type: 'error',
        error: 'Something went wrong',
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'error',
        error: 'Something went wrong',
      })
    })

    it('parses error event with details', () => {
      const line = JSON.stringify({
        type: 'error',
        error: 'API Error',
        details: { code: 500, message: 'Internal server error' },
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'error',
        error: 'API Error',
        details: { code: 500, message: 'Internal server error' },
      })
    })
  })

  describe('valid complete events', () => {
    it('parses complete event with exit code 0', () => {
      const line = JSON.stringify({
        type: 'complete',
        exitCode: 0,
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'complete',
        exitCode: 0,
      })
    })

    it('parses complete event with non-zero exit code', () => {
      const line = JSON.stringify({
        type: 'complete',
        exitCode: 1,
      })
      const result = parseStreamJson(line)

      expect(result).toEqual({
        type: 'complete',
        exitCode: 1,
      })
    })
  })

  describe('invalid input handling', () => {
    it('returns null for invalid JSON', () => {
      const result = parseStreamJson('not valid json {')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('returns null for empty line', () => {
      const result = parseStreamJson('')

      expect(result).toBeNull()
    })

    it('returns null for whitespace-only line', () => {
      const result = parseStreamJson('   \t  ')

      expect(result).toBeNull()
    })

    it('returns null for JSON with unknown event type', () => {
      const result = parseStreamJson(JSON.stringify({ type: 'unknown', data: 'test' }))

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('returns null for JSON missing required fields', () => {
      const result = parseStreamJson(JSON.stringify({ type: 'assistant' }))

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('returns null for array instead of object', () => {
      const result = parseStreamJson('[1, 2, 3]')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('returns null for primitive JSON value', () => {
      const result = parseStreamJson('"just a string"')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })
})

describe('parseStreamJsonLines', () => {
  it('parses multiple valid lines', () => {
    const lines = [
      JSON.stringify({ type: 'assistant', content: 'Hello' }),
      JSON.stringify({ type: 'tool_use', tool: 'Read', input: {} }),
      JSON.stringify({ type: 'tool_result', output: 'data' }),
    ]

    const result = parseStreamJsonLines(lines)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ type: 'assistant', content: 'Hello' })
    expect(result[1]).toEqual({ type: 'tool_use', tool: 'Read', input: {} })
    expect(result[2]).toEqual({ type: 'tool_result', output: 'data' })
  })

  it('filters out invalid lines', () => {
    const lines = [
      JSON.stringify({ type: 'assistant', content: 'Valid' }),
      'invalid json',
      '',
      JSON.stringify({ type: 'result' }),
    ]

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = parseStreamJsonLines(lines)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: 'assistant', content: 'Valid' })
    expect(result[1]).toEqual({ type: 'result' })
  })

  it('handles empty array', () => {
    const result = parseStreamJsonLines([])

    expect(result).toEqual([])
  })

  it('handles array of all invalid lines', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = parseStreamJsonLines(['invalid', '', 'also invalid'])

    expect(result).toEqual([])
  })
})

describe('streamEvents', () => {
  function createReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let index = 0

    return new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]))
          index++
        } else {
          controller.close()
        }
      },
    })
  }

  it('yields events from complete lines', async () => {
    const stream = createReadableStream([
      JSON.stringify({ type: 'assistant', content: 'Hello' }) + '\n',
      JSON.stringify({ type: 'result' }) + '\n',
    ])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'assistant', content: 'Hello' })
    expect(events[1]).toEqual({ type: 'result' })
  })

  it('handles partial lines correctly', async () => {
    const fullJson = JSON.stringify({ type: 'assistant', content: 'Hello world' })
    const stream = createReadableStream([
      fullJson.slice(0, 10),
      fullJson.slice(10, 20),
      fullJson.slice(20) + '\n',
    ])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'assistant', content: 'Hello world' })
  })

  it('handles multiple events in single chunk', async () => {
    const chunk =
      JSON.stringify({ type: 'assistant', content: 'A' }) +
      '\n' +
      JSON.stringify({ type: 'assistant', content: 'B' }) +
      '\n'
    const stream = createReadableStream([chunk])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'assistant', content: 'A' })
    expect(events[1]).toEqual({ type: 'assistant', content: 'B' })
  })

  it('processes remaining buffer on stream close', async () => {
    const stream = createReadableStream([
      JSON.stringify({ type: 'assistant', content: 'Last' }),
      // No newline at end
    ])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'assistant', content: 'Last' })
  })

  it('handles empty stream', async () => {
    const stream = createReadableStream([])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toEqual([])
  })

  it('skips invalid JSON lines', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const stream = createReadableStream([
      JSON.stringify({ type: 'assistant', content: 'Valid' }) + '\n',
      'invalid json\n',
      JSON.stringify({ type: 'result' }) + '\n',
    ])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
  })

  it('handles stream with only empty lines', async () => {
    const stream = createReadableStream(['\n\n\n'])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toEqual([])
  })

  it('handles mixed content with tool events', async () => {
    const stream = createReadableStream([
      JSON.stringify({ type: 'assistant', content: 'Let me read that file' }) + '\n',
      JSON.stringify({ type: 'tool_use', tool: 'Read', input: { file_path: '/test.ts' } }) + '\n',
      JSON.stringify({ type: 'tool_result', tool_use_id: 'tool_1', output: 'file content' }) + '\n',
      JSON.stringify({ type: 'assistant', content: 'Here is the file content' }) + '\n',
    ])

    const events: StreamEvent[] = []
    for await (const event of streamEvents(stream)) {
      events.push(event)
    }

    expect(events).toHaveLength(4)
    expect(events.map(e => e.type)).toEqual(['assistant', 'tool_use', 'tool_result', 'assistant'])
  })
})

describe('summarizeStreamEvents', () => {
  it('aggregates empty event list', () => {
    const result = summarizeStreamEvents([])

    expect(result).toEqual({
      totalEvents: 0,
      assistantMessages: 0,
      toolCalls: 0,
      toolResults: 0,
      errors: 0,
    })
  })

  it('counts assistant messages', () => {
    const events: StreamEvent[] = [
      { type: 'assistant', content: 'Hello' },
      { type: 'assistant', content: 'World' },
      { type: 'assistant', content: 'Test' },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.totalEvents).toBe(3)
    expect(result.assistantMessages).toBe(3)
    expect(result.toolCalls).toBe(0)
    expect(result.toolResults).toBe(0)
  })

  it('counts tool calls and results', () => {
    const events: StreamEvent[] = [
      { type: 'tool_use', tool: 'Read', input: {} },
      { type: 'tool_result', output: 'data1' },
      { type: 'tool_use', tool: 'Write', input: {} },
      { type: 'tool_result', output: 'data2' },
      { type: 'tool_use', tool: 'Bash', input: {} },
      { type: 'tool_result', output: 'data3' },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.totalEvents).toBe(6)
    expect(result.toolCalls).toBe(3)
    expect(result.toolResults).toBe(3)
  })

  it('counts errors', () => {
    const events: StreamEvent[] = [
      { type: 'assistant', content: 'Working' },
      { type: 'error', error: 'Error 1' },
      { type: 'error', error: 'Error 2' },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.errors).toBe(2)
    expect(result.assistantMessages).toBe(1)
  })

  it('extracts usage from result event', () => {
    const events: StreamEvent[] = [
      { type: 'assistant', content: 'Done' },
      {
        type: 'result',
        usage: {
          input_tokens: 1500,
          output_tokens: 800,
          cache_creation_input_tokens: 300,
          cache_read_input_tokens: 200,
        },
        stop_reason: 'end_turn',
      },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.usage).toEqual({
      input_tokens: 1500,
      output_tokens: 800,
      cache_creation_input_tokens: 300,
      cache_read_input_tokens: 200,
    })
    expect(result.stopReason).toBe('end_turn')
  })

  it('extracts exit code from complete event', () => {
    const events: StreamEvent[] = [
      { type: 'assistant', content: 'Finished' },
      { type: 'complete', exitCode: 0 },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.exitCode).toBe(0)
  })

  it('handles complete workflow', () => {
    const events: StreamEvent[] = [
      { type: 'assistant', content: 'Let me help you' },
      { type: 'tool_use', tool: 'Read', input: { file_path: '/src/index.ts' } },
      { type: 'tool_result', tool_use_id: 'tool_1', output: 'export {}' },
      { type: 'assistant', content: 'I found the file' },
      { type: 'tool_use', tool: 'Edit', input: { file_path: '/src/index.ts' } },
      { type: 'tool_result', tool_use_id: 'tool_2', output: 'success' },
      { type: 'assistant', content: 'Done!' },
      {
        type: 'result',
        usage: { input_tokens: 2000, output_tokens: 1000 },
        stop_reason: 'end_turn',
      },
      { type: 'complete', exitCode: 0 },
    ]

    const result = summarizeStreamEvents(events)

    expect(result).toEqual({
      totalEvents: 9,
      assistantMessages: 3,
      toolCalls: 2,
      toolResults: 2,
      errors: 0,
      usage: { input_tokens: 2000, output_tokens: 1000 },
      stopReason: 'end_turn',
      exitCode: 0,
    })
  })

  it('uses last result event if multiple present', () => {
    const events: StreamEvent[] = [
      {
        type: 'result',
        usage: { input_tokens: 100, output_tokens: 50 },
        stop_reason: 'max_tokens',
      },
      {
        type: 'result',
        usage: { input_tokens: 200, output_tokens: 100 },
        stop_reason: 'end_turn',
      },
    ]

    const result = summarizeStreamEvents(events)

    expect(result.usage).toEqual({ input_tokens: 200, output_tokens: 100 })
    expect(result.stopReason).toBe('end_turn')
  })
})
