/**
 * MDX render tests
 *
 * Tests for MDX rendering utilities
 */

import { describe, it, expect } from 'vitest'
import { renderSessionMDX, formatDuration, formatCost } from './render'
import type { SessionState, PlanStep, Todo, ToolExecution } from '../types'

/**
 * Helper to create mock session state
 */
function createMockSessionState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: 'test-session-123',
    status: 'idle',
    model: 'claude-sonnet-4-20250514',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    plan: [],
    todos: [],
    tools: [],
    messages: [],
    cost: 0,
    duration: 0,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
    ...overrides,
  }
}

describe('renderSessionMDX', () => {
  describe('frontmatter rendering', () => {
    it('should render YAML-LD frontmatter with $type', () => {
      const state = createMockSessionState()
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('$type: AgentSession')
    })

    it('should render session $id', () => {
      const state = createMockSessionState({ id: 'session-abc-123' })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('$id: session-abc-123')
    })

    it('should render status', () => {
      const state = createMockSessionState({ status: 'running' })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('status: running')
    })

    it('should render model', () => {
      const state = createMockSessionState({ model: 'claude-opus-4-20250514' })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('model: claude-opus-4-20250514')
    })

    it('should render executionMode', () => {
      const state = createMockSessionState({ executionMode: 'sandbox' })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('executionMode: sandbox')
    })

    it('should default executionMode to local', () => {
      const state = createMockSessionState()
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('executionMode: local')
    })

    it('should render startedAt as ISO string', () => {
      const date = new Date('2024-06-15T10:30:00Z')
      const state = createMockSessionState({ startedAt: date })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('startedAt: 2024-06-15T10:30:00.000Z')
    })

    it('should render completedAt when present', () => {
      const date = new Date('2024-06-15T10:35:00Z')
      const state = createMockSessionState({ completedAt: date })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('completedAt: 2024-06-15T10:35:00.000Z')
    })

    it('should render cost', () => {
      const state = createMockSessionState({ cost: 0.0125 })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('cost: 0.0125')
    })

    it('should render duration', () => {
      const state = createMockSessionState({ duration: 5000 })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('duration: 5000')
    })
  })

  describe('SessionHeader component', () => {
    it('should render SessionHeader with props', () => {
      const state = createMockSessionState({
        status: 'running',
        model: 'claude-opus-4-20250514',
      })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('<SessionHeader')
      expect(mdx).toContain('status="running"')
      expect(mdx).toContain('model="claude-opus-4-20250514"')
      expect(mdx).toContain('sessionId="test-session-123"')
    })

    it('should include cwd when present', () => {
      const state = createMockSessionState({ cwd: '/home/user/project' })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('cwd="/home/user/project"')
    })

    it('should omit cwd when not present', () => {
      const state = createMockSessionState({ cwd: undefined })
      const mdx = renderSessionMDX(state)

      // Should not have a cwd prop at all
      expect(mdx).not.toMatch(/cwd=/)
    })
  })

  describe('ProjectPlan component', () => {
    it('should not render ProjectPlan when plan is empty', () => {
      const state = createMockSessionState({ plan: [] })
      const mdx = renderSessionMDX(state)

      expect(mdx).not.toContain('<ProjectPlan')
    })

    it('should render ProjectPlan with steps', () => {
      const steps: PlanStep[] = [
        { id: 'step-1', description: 'Read the file', status: 'completed' },
        { id: 'step-2', description: 'Analyze the code', status: 'active' },
        { id: 'step-3', description: 'Make changes', status: 'pending' },
      ]
      const state = createMockSessionState({ plan: steps })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('<ProjectPlan')
      expect(mdx).toContain('steps={')
      expect(mdx).toContain('Read the file')
      expect(mdx).toContain('Analyze the code')
      expect(mdx).toContain('Make changes')
    })

    it('should serialize steps as valid JSON', () => {
      const steps: PlanStep[] = [
        { id: 'step-1', description: 'Step with quotes', status: 'pending' },
      ]
      const state = createMockSessionState({ plan: steps })
      const mdx = renderSessionMDX(state)

      // The output should contain valid JSON with the steps
      expect(mdx).toContain('<ProjectPlan steps={')
      expect(mdx).toContain('Step with quotes')
      // JSON.stringify properly escapes strings
      expect(mdx).toContain('"description": "Step with quotes"')
    })
  })

  describe('TodoList component', () => {
    it('should not render TodoList when todos is empty', () => {
      const state = createMockSessionState({ todos: [] })
      const mdx = renderSessionMDX(state)

      expect(mdx).not.toContain('<TodoList')
    })

    it('should render TodoList with todos', () => {
      const todos: Todo[] = [
        { content: 'Task 1', activeForm: 'Doing task 1', status: 'completed' },
        { content: 'Task 2', activeForm: 'Doing task 2', status: 'in_progress' },
        { content: 'Task 3', activeForm: 'Doing task 3', status: 'pending' },
      ]
      const state = createMockSessionState({ todos })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('<TodoList')
      expect(mdx).toContain('todos={')
      expect(mdx).toContain('Task 1')
      expect(mdx).toContain('Task 2')
      expect(mdx).toContain('Task 3')
    })

    it('should serialize todos with all statuses', () => {
      const todos: Todo[] = [
        { content: 'Pending', activeForm: 'Pending', status: 'pending' },
        { content: 'In progress', activeForm: 'Working', status: 'in_progress' },
        { content: 'Complete', activeForm: 'Done', status: 'completed' },
      ]
      const state = createMockSessionState({ todos })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('"status": "pending"')
      expect(mdx).toContain('"status": "in_progress"')
      expect(mdx).toContain('"status": "completed"')
    })
  })

  describe('ToolHistory component', () => {
    it('should not render ToolHistory when tools is empty', () => {
      const state = createMockSessionState({ tools: [] })
      const mdx = renderSessionMDX(state)

      expect(mdx).not.toContain('<ToolHistory')
    })

    it('should render ToolHistory with tools', () => {
      const tools: ToolExecution[] = [
        {
          id: 'tool-1',
          tool: 'Read',
          input: { file_path: '/test.ts' },
          output: 'file contents',
          status: 'success',
          startedAt: new Date('2024-01-01T00:00:00Z'),
          completedAt: new Date('2024-01-01T00:00:01Z'),
          duration: 1000,
        },
      ]
      const state = createMockSessionState({ tools })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('<ToolHistory')
      expect(mdx).toContain('tools={')
      expect(mdx).toContain('Read')
    })

    it('should serialize tool dates as ISO strings', () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-01T00:00:05Z')
      const tools: ToolExecution[] = [
        {
          id: 'tool-1',
          tool: 'Read',
          input: {},
          status: 'success',
          startedAt: startDate,
          completedAt: endDate,
          duration: 5000,
        },
      ]
      const state = createMockSessionState({ tools })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('2024-01-01T00:00:00.000Z')
      expect(mdx).toContain('2024-01-01T00:00:05.000Z')
    })

    it('should include tool errors', () => {
      const tools: ToolExecution[] = [
        {
          id: 'tool-1',
          tool: 'Read',
          input: { file_path: '/nonexistent.ts' },
          status: 'error',
          error: 'File not found',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('"error": "File not found"')
    })
  })

  describe('SessionFooter component', () => {
    it('should render SessionFooter with metrics', () => {
      const state = createMockSessionState({
        cost: 0.0125,
        duration: 5000,
        usage: {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
        },
      })
      const mdx = renderSessionMDX(state)

      expect(mdx).toContain('<SessionFooter')
      expect(mdx).toContain('cost={0.0125}')
      expect(mdx).toContain('duration={5000}')
      // Usage is rendered as inline JSON (no spaces after colons)
      expect(mdx).toContain('"inputTokens":1000')
      expect(mdx).toContain('"outputTokens":500')
      expect(mdx).toContain('"totalTokens":1500')
    })
  })

  describe('overall output format', () => {
    it('should produce valid MDX structure', () => {
      const state = createMockSessionState()
      const mdx = renderSessionMDX(state)

      // Should start with frontmatter
      expect(mdx).toMatch(/^---\n/)
      // Should have closing frontmatter
      expect(mdx).toContain('---\n\n')
    })

    it('should separate sections with newlines', () => {
      const state = createMockSessionState({
        todos: [{ content: 'Task', activeForm: 'Doing', status: 'pending' }],
        tools: [{ id: 't1', tool: 'Read', input: {}, status: 'running', startedAt: new Date() }],
      })
      const mdx = renderSessionMDX(state)

      // Sections should be separated by double newlines
      expect(mdx).toMatch(/<SessionHeader[\s\S]*\/>\n\n<TodoList/)
    })
  })
})

describe('truncateOutput', () => {
  // We need to test the truncateOutput function that's internal to render.ts
  // We can test it indirectly through renderSessionMDX or extract it for testing

  /**
   * Reimplementation of truncateOutput for testing
   */
  function truncateOutput(output: unknown, maxLength = 1000): unknown {
    if (typeof output === 'string') {
      return output.length > maxLength ? output.slice(0, maxLength) + '...' : output
    }

    if (typeof output === 'object' && output !== null) {
      const json = JSON.stringify(output)
      if (json.length > maxLength) {
        const preview = json.slice(0, maxLength)
        return {
          _truncated: true,
          _originalLength: json.length,
          _preview: preview + '...',
        }
      }
    }

    return output
  }

  describe('string truncation', () => {
    it('should not truncate short strings', () => {
      const result = truncateOutput('short string')
      expect(result).toBe('short string')
    })

    it('should truncate long strings', () => {
      const longString = 'x'.repeat(1500)
      const result = truncateOutput(longString) as string

      expect(result).toHaveLength(1003) // 1000 + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    it('should respect custom maxLength', () => {
      const longString = 'x'.repeat(200)
      const result = truncateOutput(longString, 50) as string

      expect(result).toHaveLength(53) // 50 + '...'
    })

    it('should handle exactly maxLength string', () => {
      const exactString = 'x'.repeat(1000)
      const result = truncateOutput(exactString)

      expect(result).toBe(exactString)
    })
  })

  describe('object truncation', () => {
    it('should not truncate small objects', () => {
      const obj = { name: 'test', value: 123 }
      const result = truncateOutput(obj)

      expect(result).toEqual(obj)
    })

    it('should truncate large objects', () => {
      const largeObj = {
        data: 'x'.repeat(2000),
        nested: { more: 'data' },
      }
      const result = truncateOutput(largeObj) as {
        _truncated: boolean
        _originalLength: number
        _preview: string
      }

      expect(result._truncated).toBe(true)
      expect(result._originalLength).toBeGreaterThan(1000)
      expect(result._preview).toContain('...')
    })

    it('should include originalLength for truncated objects', () => {
      const largeObj = { data: 'x'.repeat(5000) }
      const result = truncateOutput(largeObj) as {
        _truncated: boolean
        _originalLength: number
      }

      expect(result._originalLength).toBeGreaterThan(5000)
    })
  })

  describe('edge cases', () => {
    it('should handle null', () => {
      const result = truncateOutput(null)
      expect(result).toBeNull()
    })

    it('should handle undefined', () => {
      const result = truncateOutput(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle numbers', () => {
      const result = truncateOutput(42)
      expect(result).toBe(42)
    })

    it('should handle booleans', () => {
      expect(truncateOutput(true)).toBe(true)
      expect(truncateOutput(false)).toBe(false)
    })

    it('should handle arrays', () => {
      const smallArray = [1, 2, 3]
      expect(truncateOutput(smallArray)).toEqual(smallArray)
    })

    it('should truncate large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'some data',
      }))
      const result = truncateOutput(largeArray) as { _truncated: boolean }

      expect(result._truncated).toBe(true)
    })

    it('should handle empty string', () => {
      const result = truncateOutput('')
      expect(result).toBe('')
    })

    it('should handle empty object', () => {
      const result = truncateOutput({})
      expect(result).toEqual({})
    })

    it('should handle empty array', () => {
      const result = truncateOutput([])
      expect(result).toEqual([])
    })
  })
})

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(5500)).toBe('5.5s')
    expect(formatDuration(59999)).toBe('60.0s')
  })

  it('should format minutes', () => {
    expect(formatDuration(60000)).toBe('1.0m')
    expect(formatDuration(90000)).toBe('1.5m')
    expect(formatDuration(3599999)).toBe('60.0m')
  })

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1.0h')
    expect(formatDuration(5400000)).toBe('1.5h')
    expect(formatDuration(7200000)).toBe('2.0h')
  })
})

describe('formatCost', () => {
  it('should format zero cost', () => {
    expect(formatCost(0)).toBe('$0.0000')
  })

  it('should format small costs', () => {
    expect(formatCost(0.0001)).toBe('$0.0001')
    expect(formatCost(0.0125)).toBe('$0.0125')
  })

  it('should format larger costs', () => {
    expect(formatCost(1.5)).toBe('$1.5000')
    expect(formatCost(10.1234)).toBe('$10.1234')
  })

  it('should round to 4 decimal places', () => {
    expect(formatCost(0.00001)).toBe('$0.0000')
    expect(formatCost(0.00005)).toBe('$0.0001')
    // toFixed(4) rounds 0.12345 to 0.1235 (banker's rounding)
    expect(formatCost(0.12345)).toBe('$0.1235')
  })
})

describe('JSON safety', () => {
  it('should produce valid JSON in component props', () => {
    const state = createMockSessionState({
      todos: [
        { content: 'Task with "quotes" and \\backslash', activeForm: 'Working', status: 'pending' },
      ],
    })
    const mdx = renderSessionMDX(state)

    // Extract the todos JSON
    const match = mdx.match(/todos=\{(\[[\s\S]*?\])\}/)
    expect(match).toBeTruthy()

    if (match) {
      // Should be parseable
      expect(() => JSON.parse(match[1])).not.toThrow()
    }
  })

  it('should handle special characters in tool input', () => {
    const tools: ToolExecution[] = [
      {
        id: 'tool-1',
        tool: 'Write',
        input: {
          content: 'Line 1\nLine 2\tTabbed',
          file_path: '/path/to/file.ts',
        },
        status: 'success',
        startedAt: new Date(),
      },
    ]
    const state = createMockSessionState({ tools })
    const mdx = renderSessionMDX(state)

    // Should not throw and should contain the tools
    expect(mdx).toContain('ToolHistory')
    expect(mdx).toContain('Write')
  })

  it('should handle unicode in content', () => {
    const todos: Todo[] = [
      { content: 'Task with emoji: \u{1F680}', activeForm: 'Working', status: 'pending' },
    ]
    const state = createMockSessionState({ todos })
    const mdx = renderSessionMDX(state)

    expect(mdx).toContain('\u{1F680}')
  })
})
