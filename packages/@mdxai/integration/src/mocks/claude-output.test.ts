/**
 * Tests for the Mock Claude Output Generator
 *
 * Verifies that the mock generators produce valid, realistic Claude Code output.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  mockAssistantEvent,
  mockToolUseEvent,
  mockToolResultEvent,
  mockResultEvent,
  mockErrorEvent,
  mockTodoWriteEvent,
  mockReadEvent,
  mockWriteEvent,
  mockEditEvent,
  mockBashEvent,
  mockGrepEvent,
  mockGlobEvent,
  generateUsage,
  calculateCost,
  generateSessionFlow,
  generateReadFileFlow,
  generateEditCodeFlow,
  generateTestRunFlow,
  generateErrorFlow,
  generateComplexSessionFlow,
  eventsToStreamJson,
  createEventStream,
  resetToolIdCounter,
  generateToolId,
} from './claude-output'

describe('Mock Claude Output Generator', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  describe('mockAssistantEvent', () => {
    it('should create valid assistant event', () => {
      const event = mockAssistantEvent('Hello, I will help you.')

      expect(event.type).toBe('assistant')
      expect(event.content).toBe('Hello, I will help you.')
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('should preserve multiline content', () => {
      const content = `Line 1
Line 2
Line 3`
      const event = mockAssistantEvent(content)

      expect(event.content).toBe(content)
    })
  })

  describe('mockToolUseEvent', () => {
    it('should create valid tool_use event', () => {
      const event = mockToolUseEvent('Read', { file_path: '/test.ts' })

      expect(event.type).toBe('tool_use')
      expect(event.tool).toBe('Read')
      expect(event.input).toEqual({ file_path: '/test.ts' })
      expect(event.id).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('should generate unique IDs', () => {
      const event1 = mockToolUseEvent('Read', {})
      const event2 = mockToolUseEvent('Read', {})

      expect(event1.id).not.toBe(event2.id)
    })

    it('should accept custom ID', () => {
      const event = mockToolUseEvent('Read', {}, 'custom-id')

      expect(event.id).toBe('custom-id')
    })
  })

  describe('mockToolResultEvent', () => {
    it('should create valid tool_result event', () => {
      const event = mockToolResultEvent('tool-123', 'result output')

      expect(event.type).toBe('tool_result')
      expect(event.id).toBe('tool-123')
      expect(event.output).toBe('result output')
      expect(event.error).toBeUndefined()
    })

    it('should include error if provided', () => {
      const event = mockToolResultEvent('tool-123', null, 'Error message')

      expect(event.error).toBe('Error message')
    })
  })

  describe('mockResultEvent', () => {
    it('should create valid result event', () => {
      const usage = generateUsage(1000, 500)
      const event = mockResultEvent(0.01, usage)

      expect(event.type).toBe('result')
      expect(event.cost).toBe(0.01)
      expect(event.duration).toBeGreaterThan(0)
      expect(event.usage).toEqual(usage)
    })
  })

  describe('mockErrorEvent', () => {
    it('should create valid error event', () => {
      const event = mockErrorEvent('Something went wrong')

      expect(event.type).toBe('error')
      expect(event.error).toBe('Something went wrong')
      expect(event.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Tool-specific helpers', () => {
    it('mockTodoWriteEvent should create TodoWrite event', () => {
      const todos = [
        { content: 'Task 1', activeForm: 'Doing 1', status: 'pending' as const },
      ]
      const event = mockTodoWriteEvent(todos)

      expect(event.tool).toBe('TodoWrite')
      expect(event.input).toEqual({ todos })
    })

    it('mockReadEvent should create Read event', () => {
      const event = mockReadEvent('/src/index.ts')

      expect(event.tool).toBe('Read')
      expect(event.input).toEqual({ file_path: '/src/index.ts' })
    })

    it('mockWriteEvent should create Write event', () => {
      const event = mockWriteEvent('/src/new.ts', 'export {}')

      expect(event.tool).toBe('Write')
      expect(event.input).toEqual({
        file_path: '/src/new.ts',
        content: 'export {}',
      })
    })

    it('mockEditEvent should create Edit event', () => {
      const event = mockEditEvent('/src/file.ts', 'old', 'new')

      expect(event.tool).toBe('Edit')
      expect(event.input).toEqual({
        file_path: '/src/file.ts',
        old_string: 'old',
        new_string: 'new',
      })
    })

    it('mockBashEvent should create Bash event', () => {
      const event = mockBashEvent('npm test')

      expect(event.tool).toBe('Bash')
      expect(event.input).toEqual({ command: 'npm test' })
    })

    it('mockGrepEvent should create Grep event', () => {
      const event = mockGrepEvent('function', '/src')

      expect(event.tool).toBe('Grep')
      expect(event.input).toEqual({ pattern: 'function', path: '/src' })
    })

    it('mockGlobEvent should create Glob event', () => {
      const event = mockGlobEvent('**/*.ts', '/src')

      expect(event.tool).toBe('Glob')
      expect(event.input).toEqual({ pattern: '**/*.ts', path: '/src' })
    })
  })

  describe('generateUsage', () => {
    it('should calculate totalTokens correctly', () => {
      const usage = generateUsage(1000, 500)

      expect(usage.inputTokens).toBe(1000)
      expect(usage.outputTokens).toBe(500)
      expect(usage.totalTokens).toBe(1500)
    })

    it('should include cache tokens when provided', () => {
      const usage = generateUsage(1000, 500, 100, 200)

      expect(usage.cacheCreationTokens).toBe(100)
      expect(usage.cacheReadTokens).toBe(200)
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost based on tokens', () => {
      const usage = generateUsage(1000, 500)
      const cost = calculateCost(usage)

      // $15/MTok input + $75/MTok output
      // 1000/1M * 15 + 500/1M * 75 = 0.015 + 0.0375 = 0.0525
      expect(cost).toBeCloseTo(0.0525, 4)
    })
  })

  describe('generateSessionFlow', () => {
    it('should generate events from steps', () => {
      const events = generateSessionFlow({
        steps: [
          { type: 'assistant', content: 'Hello' },
          { type: 'tool', tool: 'Read', input: { file: '/test' }, output: 'content' },
        ],
      })

      expect(events.length).toBeGreaterThanOrEqual(4) // assistant + tool_use + tool_result + result
      expect(events[0].type).toBe('assistant')
      expect(events[1].type).toBe('tool_use')
      expect(events[2].type).toBe('tool_result')
      expect(events[events.length - 1].type).toBe('result')
    })

    it('should handle error steps', () => {
      const events = generateSessionFlow({
        steps: [
          { type: 'assistant', content: 'Starting' },
          { type: 'error', error: 'Failed' },
        ],
      })

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
    })
  })

  describe('generateReadFileFlow', () => {
    it('should generate read file events', () => {
      const events = generateReadFileFlow('/test.ts', 'file content')

      expect(events.length).toBeGreaterThan(0)
      const readEvent = events.find(
        (e) => e.type === 'tool_use' && (e as { tool: string }).tool === 'Read'
      )
      expect(readEvent).toBeDefined()
    })
  })

  describe('generateEditCodeFlow', () => {
    it('should generate edit code events with todos', () => {
      const events = generateEditCodeFlow(
        '/src/file.ts',
        'fix a bug',
        'old code',
        'new code'
      )

      expect(events.length).toBeGreaterThan(0)

      // Should have TodoWrite events
      const todoEvents = events.filter(
        (e) => e.type === 'tool_use' && (e as { tool: string }).tool === 'TodoWrite'
      )
      expect(todoEvents.length).toBeGreaterThan(0)

      // Should have Edit event
      const editEvent = events.find(
        (e) => e.type === 'tool_use' && (e as { tool: string }).tool === 'Edit'
      )
      expect(editEvent).toBeDefined()
    })
  })

  describe('generateTestRunFlow', () => {
    it('should generate test run events', () => {
      const events = generateTestRunFlow('npm test', 5, 0, 'All tests passed')

      // Should have Bash event
      const bashEvent = events.find(
        (e) => e.type === 'tool_use' && (e as { tool: string }).tool === 'Bash'
      )
      expect(bashEvent).toBeDefined()

      // Should have success message
      const successMessage = events.find(
        (e) => e.type === 'assistant' && (e as { content: string }).content.includes('passed')
      )
      expect(successMessage).toBeDefined()
    })

    it('should include failure message when tests fail', () => {
      const events = generateTestRunFlow('npm test', 3, 2, 'Tests failed')

      const failureMessage = events.find(
        (e) => e.type === 'assistant' && (e as { content: string }).content.includes('failure')
      )
      expect(failureMessage).toBeDefined()
    })
  })

  describe('generateErrorFlow', () => {
    it('should generate error flow', () => {
      const events = generateErrorFlow('API error occurred', 'Starting task...')

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('assistant')
      expect(events[1].type).toBe('error')
    })

    it('should work without context', () => {
      const events = generateErrorFlow('Error occurred')

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
    })
  })

  describe('generateComplexSessionFlow', () => {
    it('should generate complex flow with multiple tool types', () => {
      const events = generateComplexSessionFlow()

      // Should have variety of event types
      const types = new Set(events.map((e) => e.type))
      expect(types.has('assistant')).toBe(true)
      expect(types.has('tool_use')).toBe(true)
      expect(types.has('tool_result')).toBe(true)
      expect(types.has('result')).toBe(true)

      // Should have various tools
      const tools = events
        .filter((e) => e.type === 'tool_use')
        .map((e) => (e as { tool: string }).tool)
      expect(tools).toContain('TodoWrite')
      expect(tools).toContain('Read')
    })

    it('should complete with result', () => {
      const events = generateComplexSessionFlow()
      const lastEvent = events[events.length - 1]

      expect(lastEvent.type).toBe('result')
    })
  })

  describe('eventsToStreamJson', () => {
    it('should convert events to newline-delimited JSON', () => {
      const events = [
        mockAssistantEvent('Hello'),
        mockToolUseEvent('Read', { file: '/test' }),
      ]

      const streamJson = eventsToStreamJson(events)
      const lines = streamJson.trim().split('\n')

      expect(lines).toHaveLength(2)
      expect(JSON.parse(lines[0]).type).toBe('assistant')
      expect(JSON.parse(lines[1]).type).toBe('tool_use')
    })

    it('should end with newline', () => {
      const events = [mockAssistantEvent('Hello')]
      const streamJson = eventsToStreamJson(events)

      expect(streamJson.endsWith('\n')).toBe(true)
    })
  })

  describe('createEventStream', () => {
    it('should create readable stream from events', async () => {
      const events = [
        mockAssistantEvent('Hello'),
        mockToolUseEvent('Read', {}),
      ]

      const stream = createEventStream(events, 0)
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      const chunks: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(decoder.decode(value))
      }

      expect(chunks).toHaveLength(2)
      expect(JSON.parse(chunks[0]).type).toBe('assistant')
      expect(JSON.parse(chunks[1]).type).toBe('tool_use')
    })
  })

  describe('generateToolId', () => {
    it('should generate unique IDs', () => {
      resetToolIdCounter()
      const id1 = generateToolId()
      const id2 = generateToolId()
      const id3 = generateToolId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1.startsWith('toolu_')).toBe(true)
    })

    it('should reset counter', () => {
      resetToolIdCounter()
      const firstId = generateToolId()
      resetToolIdCounter()
      const resetId = generateToolId()

      // Both should start with toolu_1_ (after counter reset)
      expect(firstId.startsWith('toolu_1_')).toBe(true)
      expect(resetId.startsWith('toolu_1_')).toBe(true)
    })
  })
})
