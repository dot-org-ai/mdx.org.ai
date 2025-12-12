/**
 * MDX components tests
 *
 * Tests for MDX component definitions and utilities
 */

import { describe, it, expect } from 'vitest'
import { getDefaultProps } from './components'
import type {
  SessionHeaderProps,
  ProjectPlanProps,
  TodoListProps,
  ToolHistoryProps,
  SessionFooterProps,
} from './components'

describe('getDefaultProps', () => {
  describe('SessionHeader defaults', () => {
    it('should return default SessionHeader props', () => {
      const defaults = getDefaultProps('SessionHeader') as Partial<SessionHeaderProps>

      expect(defaults.status).toBe('idle')
      expect(defaults.model).toBe('claude-sonnet-4-20250514')
      expect(defaults.sessionId).toBe('')
    })
  })

  describe('ProjectPlan defaults', () => {
    it('should return default ProjectPlan props', () => {
      const defaults = getDefaultProps('ProjectPlan') as Partial<ProjectPlanProps>

      expect(defaults.steps).toEqual([])
    })
  })

  describe('TodoList defaults', () => {
    it('should return default TodoList props', () => {
      const defaults = getDefaultProps('TodoList') as Partial<TodoListProps>

      expect(defaults.todos).toEqual([])
    })
  })

  describe('ToolHistory defaults', () => {
    it('should return default ToolHistory props', () => {
      const defaults = getDefaultProps('ToolHistory') as Partial<ToolHistoryProps>

      expect(defaults.tools).toEqual([])
    })
  })

  describe('SessionFooter defaults', () => {
    it('should return default SessionFooter props', () => {
      const defaults = getDefaultProps('SessionFooter') as Partial<SessionFooterProps>

      expect(defaults.cost).toBe(0)
      expect(defaults.duration).toBe(0)
      expect(defaults.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      })
    })
  })

  describe('unknown component', () => {
    it('should return empty object for unknown component', () => {
      // @ts-expect-error - testing unknown component
      const defaults = getDefaultProps('UnknownComponent')

      expect(defaults).toEqual({})
    })
  })
})

describe('ComponentRegistry type', () => {
  it('should define all expected components', () => {
    // Type-level test: these should compile without errors
    const _header: SessionHeaderProps = {
      status: 'running',
      model: 'claude-sonnet-4-20250514',
      sessionId: 'test-123',
    }

    const _plan: ProjectPlanProps = {
      steps: [
        { id: '1', description: 'Step 1', status: 'completed' },
      ],
    }

    const _todos: TodoListProps = {
      todos: [
        { content: 'Task', activeForm: 'Doing', status: 'pending' },
      ],
    }

    const _tools: ToolHistoryProps = {
      tools: [
        {
          id: 't1',
          tool: 'Read',
          input: {},
          status: 'success',
          startedAt: new Date(),
        },
      ],
    }

    const _footer: SessionFooterProps = {
      cost: 0.01,
      duration: 1000,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
    }

    // If we get here, all types are valid
    expect(true).toBe(true)
  })
})

describe('props interface completeness', () => {
  it('SessionHeaderProps should include optional cwd', () => {
    const props: SessionHeaderProps = {
      status: 'idle',
      model: 'test',
      sessionId: 'id',
      cwd: '/path/to/dir',
    }
    expect(props.cwd).toBe('/path/to/dir')
  })

  it('SessionHeaderProps should work without cwd', () => {
    const props: SessionHeaderProps = {
      status: 'idle',
      model: 'test',
      sessionId: 'id',
    }
    expect(props.cwd).toBeUndefined()
  })

  it('ToolExecution in ToolHistoryProps should handle all statuses', () => {
    const props: ToolHistoryProps = {
      tools: [
        { id: '1', tool: 'A', input: {}, status: 'running', startedAt: new Date() },
        { id: '2', tool: 'B', input: {}, status: 'success', startedAt: new Date() },
        { id: '3', tool: 'C', input: {}, status: 'error', startedAt: new Date() },
      ],
    }
    expect(props.tools).toHaveLength(3)
  })

  it('SessionFooterProps should include optional cache tokens', () => {
    const props: SessionFooterProps = {
      cost: 0,
      duration: 0,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cacheCreationTokens: 10,
        cacheReadTokens: 20,
      },
    }
    expect(props.usage.cacheCreationTokens).toBe(10)
    expect(props.usage.cacheReadTokens).toBe(20)
  })
})
