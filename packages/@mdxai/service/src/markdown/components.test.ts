/**
 * Markdown components tests
 *
 * Tests for markdown rendering component functions
 */

import { describe, it, expect } from 'vitest'
import {
  renderSessionHeader,
  renderProjectPlan,
  renderTodoList,
  renderToolHistory,
  renderSessionFooter,
  markdownComponents,
} from './components'

describe('renderSessionHeader', () => {
  it('should render with all required props', () => {
    const result = renderSessionHeader({
      status: 'running',
      model: 'claude-sonnet-4-20250514',
      sessionId: 'test-session-12345678',
    })

    expect(result).toContain('Claude Agent Session')
    expect(result).toContain('running')
    expect(result).toContain('claude-sonnet-4-20250514')
    expect(result).toContain('test-ses...')
  })

  it('should include cwd row when provided', () => {
    const result = renderSessionHeader({
      status: 'idle',
      model: 'test-model',
      sessionId: 'id',
      cwd: '/home/user/project',
    })

    expect(result).toContain('/home/user/project')
    expect(result).toContain('CWD')
  })

  it('should not include cwd row when not provided', () => {
    const result = renderSessionHeader({
      status: 'idle',
      model: 'test-model',
      sessionId: 'id',
    })

    expect(result).not.toContain('CWD')
  })

  it('should include correct status emoji for each status', () => {
    expect(renderSessionHeader({
      status: 'idle',
      model: 'm',
      sessionId: 'i'
    })).toContain('\u23F8\uFE0F')

    expect(renderSessionHeader({
      status: 'running',
      model: 'm',
      sessionId: 'i'
    })).toContain('\u25B6\uFE0F')

    expect(renderSessionHeader({
      status: 'completed',
      model: 'm',
      sessionId: 'i'
    })).toContain('\u2705')

    expect(renderSessionHeader({
      status: 'error',
      model: 'm',
      sessionId: 'i'
    })).toContain('\u274C')
  })
})

describe('renderProjectPlan', () => {
  it('should return empty string for empty steps', () => {
    const result = renderProjectPlan({ steps: [] })
    expect(result).toBe('')
  })

  it('should render steps with correct emojis', () => {
    const result = renderProjectPlan({
      steps: [
        { id: '1', description: 'Pending step', status: 'pending' },
        { id: '2', description: 'Active step', status: 'active' },
        { id: '3', description: 'Completed step', status: 'completed' },
        { id: '4', description: 'Skipped step', status: 'skipped' },
      ],
    })

    expect(result).toContain('\u2B55') // pending
    expect(result).toContain('\u25B6\uFE0F') // active
    expect(result).toContain('\u2705') // completed
    expect(result).toContain('\u23ED\uFE0F') // skipped
  })

  it('should number steps sequentially', () => {
    const result = renderProjectPlan({
      steps: [
        { id: 'a', description: 'First', status: 'pending' },
        { id: 'b', description: 'Second', status: 'pending' },
        { id: 'c', description: 'Third', status: 'pending' },
      ],
    })

    expect(result).toContain('**1.**')
    expect(result).toContain('**2.**')
    expect(result).toContain('**3.**')
  })

  it('should include plan header', () => {
    const result = renderProjectPlan({
      steps: [{ id: '1', description: 'Test', status: 'pending' }],
    })

    expect(result).toContain('\u{1F4CB} Plan')
  })
})

describe('renderTodoList', () => {
  it('should return empty string for empty todos', () => {
    const result = renderTodoList({ todos: [] })
    expect(result).toBe('')
  })

  it('should render todos with correct checkbox markers', () => {
    const result = renderTodoList({
      todos: [
        { content: 'Pending', activeForm: 'Working', status: 'pending' },
        { content: 'In progress', activeForm: 'Working', status: 'in_progress' },
        { content: 'Completed', activeForm: 'Done', status: 'completed' },
      ],
    })

    expect(result).toContain('- [ ] Pending')
    expect(result).toContain('- [-] In progress')
    expect(result).toContain('- [x] Completed')
  })

  it('should show progress count', () => {
    const result = renderTodoList({
      todos: [
        { content: 'A', activeForm: 'A', status: 'completed' },
        { content: 'B', activeForm: 'B', status: 'completed' },
        { content: 'C', activeForm: 'C', status: 'pending' },
        { content: 'D', activeForm: 'D', status: 'in_progress' },
      ],
    })

    expect(result).toContain('(2/4)')
  })

  it('should include tasks header', () => {
    const result = renderTodoList({
      todos: [{ content: 'Test', activeForm: 'Testing', status: 'pending' }],
    })

    expect(result).toContain('\u2705 Tasks')
  })
})

describe('renderToolHistory', () => {
  it('should return empty string for empty tools', () => {
    const result = renderToolHistory({ tools: [] })
    expect(result).toBe('')
  })

  it('should render tools with status emojis', () => {
    const now = new Date()
    const result = renderToolHistory({
      tools: [
        { id: '1', tool: 'Running', input: {}, status: 'running', startedAt: now },
        { id: '2', tool: 'Success', input: {}, status: 'success', startedAt: now },
        { id: '3', tool: 'Error', input: {}, status: 'error', startedAt: now },
      ],
    })

    expect(result).toContain('\u23F3') // running
    expect(result).toContain('\u2705') // success
    expect(result).toContain('\u274C') // error
  })

  it('should use details/summary for collapsible sections', () => {
    const result = renderToolHistory({
      tools: [
        { id: '1', tool: 'Test', input: {}, status: 'success', startedAt: new Date() },
      ],
    })

    expect(result).toContain('<details>')
    expect(result).toContain('<summary>')
    expect(result).toContain('</summary>')
    expect(result).toContain('</details>')
  })

  it('should include duration when available', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Test',
          input: {},
          status: 'success',
          startedAt: new Date(),
          duration: 2500,
        },
      ],
    })

    expect(result).toContain('2.5s')
  })

  it('should render input as JSON', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Read',
          input: { file_path: '/test.ts', limit: 100 },
          status: 'success',
          startedAt: new Date(),
        },
      ],
    })

    expect(result).toContain('```json')
    expect(result).toContain('file_path')
    expect(result).toContain('/test.ts')
  })

  it('should render output for successful tools', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Test',
          input: {},
          output: 'Tool output content',
          status: 'success',
          startedAt: new Date(),
        },
      ],
    })

    expect(result).toContain('**Output:**')
    expect(result).toContain('Tool output content')
  })

  it('should render error for failed tools', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Test',
          input: {},
          error: 'Something went wrong',
          status: 'error',
          startedAt: new Date(),
        },
      ],
    })

    expect(result).toContain('**Error:**')
    expect(result).toContain('Something went wrong')
  })

  it('should truncate long output', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Test',
          input: {},
          output: 'x'.repeat(300),
          status: 'success',
          startedAt: new Date(),
        },
      ],
    })

    expect(result).toContain('...')
  })

  it('should handle object output', () => {
    const result = renderToolHistory({
      tools: [
        {
          id: '1',
          tool: 'Test',
          input: {},
          output: { key: 'value', nested: { data: 123 } },
          status: 'success',
          startedAt: new Date(),
        },
      ],
    })

    expect(result).toContain('key')
    expect(result).toContain('value')
  })

  it('should show tool count in header', () => {
    const now = new Date()
    const result = renderToolHistory({
      tools: [
        { id: '1', tool: 'A', input: {}, status: 'success', startedAt: now },
        { id: '2', tool: 'B', input: {}, status: 'success', startedAt: now },
        { id: '3', tool: 'C', input: {}, status: 'success', startedAt: now },
      ],
    })

    expect(result).toContain('(3)')
  })
})

describe('renderSessionFooter', () => {
  it('should render cost formatted', () => {
    const result = renderSessionFooter({
      cost: 0.0125,
      duration: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    })

    expect(result).toContain('$0.0125')
  })

  it('should render duration formatted', () => {
    const result = renderSessionFooter({
      cost: 0,
      duration: 5500,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    })

    expect(result).toContain('5.5s')
  })

  it('should render token counts', () => {
    const result = renderSessionFooter({
      cost: 0,
      duration: 0,
      usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
    })

    expect(result).toContain('1500')
    expect(result).toContain('1000 in')
    expect(result).toContain('500 out')
  })

  it('should include separator line', () => {
    const result = renderSessionFooter({
      cost: 0,
      duration: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    })

    expect(result).toMatch(/^---/)
  })
})

describe('markdownComponents registry', () => {
  it('should export all component renderers', () => {
    expect(markdownComponents.SessionHeader).toBe(renderSessionHeader)
    expect(markdownComponents.ProjectPlan).toBe(renderProjectPlan)
    expect(markdownComponents.TodoList).toBe(renderTodoList)
    expect(markdownComponents.ToolHistory).toBe(renderToolHistory)
    expect(markdownComponents.SessionFooter).toBe(renderSessionFooter)
  })

  it('should have exactly 5 components', () => {
    expect(Object.keys(markdownComponents)).toHaveLength(5)
  })
})
