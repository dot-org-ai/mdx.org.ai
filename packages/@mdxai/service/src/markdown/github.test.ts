/**
 * GitHub Markdown rendering tests
 *
 * Tests for GitHub-flavored Markdown output
 */

import { describe, it, expect } from 'vitest'
import { toGitHubMarkdown, createGitHubComment, createMinimalUpdate } from './github'
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

describe('toGitHubMarkdown', () => {
  describe('header rendering', () => {
    it('should render session header with status emoji for idle', () => {
      const state = createMockSessionState({ status: 'idle' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u23F8\uFE0F') // pause emoji
      expect(md).toContain('Claude Agent Session')
    })

    it('should render session header with status emoji for running', () => {
      const state = createMockSessionState({ status: 'running' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u25B6\uFE0F') // play emoji
    })

    it('should render session header with status emoji for completed', () => {
      const state = createMockSessionState({ status: 'completed' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u2705') // checkmark emoji
    })

    it('should render session header with status emoji for error', () => {
      const state = createMockSessionState({ status: 'error' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u274C') // x emoji
    })

    it('should render model in header table', () => {
      const state = createMockSessionState({ model: 'claude-opus-4-20250514' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('claude-opus-4-20250514')
    })

    it('should render truncated session ID', () => {
      const state = createMockSessionState({ id: 'abcdefgh-1234-5678-9abc-def012345678' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('`abcdefgh...`')
    })

    it('should render cwd when present', () => {
      const state = createMockSessionState({ cwd: '/home/user/project' })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('/home/user/project')
    })
  })

  describe('plan rendering', () => {
    it('should not render plan section when empty', () => {
      const state = createMockSessionState({ plan: [] })
      const md = toGitHubMarkdown(state)

      expect(md).not.toContain('\u{1F4CB} Plan')
    })

    it('should render plan with step status emojis', () => {
      const steps: PlanStep[] = [
        { id: '1', description: 'Read files', status: 'completed' },
        { id: '2', description: 'Analyze code', status: 'active' },
        { id: '3', description: 'Make changes', status: 'pending' },
        { id: '4', description: 'Optional step', status: 'skipped' },
      ]
      const state = createMockSessionState({ plan: steps })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u{1F4CB} Plan')
      expect(md).toContain('\u2705') // completed
      expect(md).toContain('\u25B6\uFE0F') // active
      expect(md).toContain('\u2B55') // pending
      expect(md).toContain('\u23ED\uFE0F') // skipped
    })

    it('should number plan steps', () => {
      const steps: PlanStep[] = [
        { id: '1', description: 'First step', status: 'pending' },
        { id: '2', description: 'Second step', status: 'pending' },
      ]
      const state = createMockSessionState({ plan: steps })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('**1.**')
      expect(md).toContain('**2.**')
    })
  })

  describe('todos rendering', () => {
    it('should not render todos section when empty', () => {
      const state = createMockSessionState({ todos: [] })
      const md = toGitHubMarkdown(state)

      expect(md).not.toContain('Tasks')
    })

    it('should render todos with checkbox markers', () => {
      const todos: Todo[] = [
        { content: 'Pending task', activeForm: 'Working', status: 'pending' },
        { content: 'In progress task', activeForm: 'Working', status: 'in_progress' },
        { content: 'Completed task', activeForm: 'Done', status: 'completed' },
      ]
      const state = createMockSessionState({ todos })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('- [ ] Pending task')
      expect(md).toContain('- [-] In progress task')
      expect(md).toContain('- [x] Completed task')
    })

    it('should show progress count in todos header', () => {
      const todos: Todo[] = [
        { content: 'Done 1', activeForm: 'Done', status: 'completed' },
        { content: 'Done 2', activeForm: 'Done', status: 'completed' },
        { content: 'Pending', activeForm: 'Working', status: 'pending' },
      ]
      const state = createMockSessionState({ todos })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('(2/3)')
    })
  })

  describe('tools rendering', () => {
    it('should not render tools section when empty', () => {
      const state = createMockSessionState({ tools: [] })
      const md = toGitHubMarkdown(state)

      expect(md).not.toContain('Tool Calls')
    })

    it('should render tools with status emojis', () => {
      const tools: ToolExecution[] = [
        { id: '1', tool: 'Read', input: {}, status: 'running', startedAt: new Date() },
        { id: '2', tool: 'Write', input: {}, status: 'success', startedAt: new Date() },
        { id: '3', tool: 'Bash', input: {}, status: 'error', startedAt: new Date() },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('\u23F3') // running (hourglass)
      expect(md).toContain('\u2705') // success
      expect(md).toContain('\u274C') // error
    })

    it('should render tools with details/summary for collapsible sections', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: { file_path: '/test.ts' },
          status: 'success',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('<details>')
      expect(md).toContain('<summary>')
      expect(md).toContain('</details>')
    })

    it('should show tool count in header', () => {
      const tools: ToolExecution[] = [
        { id: '1', tool: 'Read', input: {}, status: 'success', startedAt: new Date() },
        { id: '2', tool: 'Write', input: {}, status: 'success', startedAt: new Date() },
        { id: '3', tool: 'Bash', input: {}, status: 'success', startedAt: new Date() },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('(3)')
    })

    it('should render tool input as JSON', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: { file_path: '/test/file.ts', limit: 100 },
          status: 'success',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('```json')
      expect(md).toContain('file_path')
      expect(md).toContain('/test/file.ts')
    })

    it('should render tool output for successful tools', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: {},
          output: 'File contents here',
          status: 'success',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('**Output:**')
      expect(md).toContain('File contents')
    })

    it('should render tool error for failed tools', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: { file_path: '/nonexistent.ts' },
          error: 'File not found',
          status: 'error',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('**Error:**')
      expect(md).toContain('File not found')
    })

    it('should show tool duration when available', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: {},
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 1500,
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('1.5s')
    })

    it('should truncate long tool output', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Read',
          input: {},
          output: 'x'.repeat(300),
          status: 'success',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('...')
    })

    it('should truncate long tool input', () => {
      const tools: ToolExecution[] = [
        {
          id: '1',
          tool: 'Write',
          input: { content: 'x'.repeat(1000) },
          status: 'success',
          startedAt: new Date(),
        },
      ]
      const state = createMockSessionState({ tools })
      const md = toGitHubMarkdown(state)

      // Input should be truncated to 500 chars
      const inputMatch = md.match(/```json\n([\s\S]*?)\n```/)
      expect(inputMatch).toBeTruthy()
      if (inputMatch) {
        expect(inputMatch[1].length).toBeLessThanOrEqual(510) // 500 + some formatting
      }
    })
  })

  describe('footer rendering', () => {
    it('should render cost in footer', () => {
      const state = createMockSessionState({ cost: 0.0125 })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('$0.0125')
    })

    it('should render duration in footer', () => {
      const state = createMockSessionState({ duration: 5000 })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('5.0s')
    })

    it('should render token counts in footer', () => {
      const state = createMockSessionState({
        usage: {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
        },
      })
      const md = toGitHubMarkdown(state)

      expect(md).toContain('1500')
      expect(md).toContain('1000 in')
      expect(md).toContain('500 out')
    })
  })

  describe('overall format', () => {
    it('should filter out empty sections', () => {
      const state = createMockSessionState()
      const md = toGitHubMarkdown(state)

      // Should have header and footer but no plan, todos, or tools
      expect(md).toContain('Claude Agent Session')
      expect(md).not.toContain('Plan')
      expect(md).not.toContain('Tasks')
      expect(md).not.toContain('Tool Calls')
    })

    it('should separate sections with double newlines', () => {
      const state = createMockSessionState({
        todos: [{ content: 'Task', activeForm: 'Working', status: 'pending' }],
        tools: [{ id: '1', tool: 'Read', input: {}, status: 'success', startedAt: new Date() }],
      })
      const md = toGitHubMarkdown(state)

      // Sections should be separated
      expect(md.split('\n\n').length).toBeGreaterThan(3)
    })
  })
})

describe('createGitHubComment', () => {
  it('should include session markdown', () => {
    const state = createMockSessionState()
    const comment = createGitHubComment(state)

    expect(comment).toContain('Claude Agent Session')
  })

  it('should include attribution footer', () => {
    const state = createMockSessionState()
    const comment = createGitHubComment(state)

    expect(comment).toContain('---')
    expect(comment).toContain('agents.do')
    expect(comment).toContain('Session:')
  })

  it('should include session link with truncated ID', () => {
    const state = createMockSessionState({ id: 'abcdefgh-1234-5678-9abc-def012345678' })
    const comment = createGitHubComment(state)

    expect(comment).toContain('[`abcdefgh`]')
    expect(comment).toContain('https://agents.do/sessions/abcdefgh-1234-5678-9abc-def012345678')
  })

  it('should use italics for attribution', () => {
    const state = createMockSessionState()
    const comment = createGitHubComment(state)

    expect(comment).toMatch(/\*Updated by/)
    expect(comment).toMatch(/\*$/)
  })
})

describe('createMinimalUpdate', () => {
  it('should include status emoji for idle', () => {
    const state = createMockSessionState({ status: 'idle' })
    const update = createMinimalUpdate(state)

    expect(update).toContain('\u23F8\uFE0F')
    expect(update).toContain('**idle**')
  })

  it('should include status emoji for running', () => {
    const state = createMockSessionState({ status: 'running' })
    const update = createMinimalUpdate(state)

    expect(update).toContain('\u25B6\uFE0F')
    expect(update).toContain('**running**')
  })

  it('should include status emoji for completed', () => {
    const state = createMockSessionState({ status: 'completed' })
    const update = createMinimalUpdate(state)

    expect(update).toContain('\u2705')
    expect(update).toContain('**completed**')
  })

  it('should include status emoji for error', () => {
    const state = createMockSessionState({ status: 'error' })
    const update = createMinimalUpdate(state)

    expect(update).toContain('\u274C')
    expect(update).toContain('**error**')
  })

  it('should show task progress', () => {
    const todos: Todo[] = [
      { content: 'Done', activeForm: 'Done', status: 'completed' },
      { content: 'Done 2', activeForm: 'Done', status: 'completed' },
      { content: 'Pending', activeForm: 'Working', status: 'pending' },
    ]
    const state = createMockSessionState({ todos })
    const update = createMinimalUpdate(state)

    expect(update).toContain('Tasks: 2/3')
  })

  it('should show tool count', () => {
    const tools: ToolExecution[] = [
      { id: '1', tool: 'Read', input: {}, status: 'success', startedAt: new Date() },
      { id: '2', tool: 'Write', input: {}, status: 'success', startedAt: new Date() },
    ]
    const state = createMockSessionState({ tools })
    const update = createMinimalUpdate(state)

    expect(update).toContain('Tools: 2')
  })

  it('should show cost', () => {
    const state = createMockSessionState({ cost: 0.0125 })
    const update = createMinimalUpdate(state)

    expect(update).toContain('Cost: $0.0125')
  })

  it('should use pipe separators', () => {
    const state = createMockSessionState()
    const update = createMinimalUpdate(state)

    const pipes = update.match(/\|/g) || []
    expect(pipes.length).toBe(3)
  })

  it('should be a single line', () => {
    const state = createMockSessionState({
      todos: [{ content: 'Task', activeForm: 'Working', status: 'pending' }],
      tools: [{ id: '1', tool: 'Read', input: {}, status: 'success', startedAt: new Date() }],
    })
    const update = createMinimalUpdate(state)

    expect(update).not.toContain('\n')
  })
})

describe('component integration', () => {
  it('should render complete session state', () => {
    const state = createMockSessionState({
      status: 'completed',
      plan: [
        { id: '1', description: 'Read files', status: 'completed' },
        { id: '2', description: 'Make changes', status: 'completed' },
      ],
      todos: [
        { content: 'Update code', activeForm: 'Updating', status: 'completed' },
        { content: 'Run tests', activeForm: 'Running', status: 'completed' },
      ],
      tools: [
        {
          id: 't1',
          tool: 'Read',
          input: { file_path: '/test.ts' },
          output: 'contents',
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 100,
        },
        {
          id: 't2',
          tool: 'Write',
          input: { file_path: '/test.ts', content: 'new contents' },
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 50,
        },
      ],
      cost: 0.025,
      duration: 10000,
      usage: {
        inputTokens: 2000,
        outputTokens: 1000,
        totalTokens: 3000,
      },
    })

    const md = toGitHubMarkdown(state)

    // All sections should be present
    expect(md).toContain('Claude Agent Session')
    expect(md).toContain('Plan')
    expect(md).toContain('Tasks')
    expect(md).toContain('Tool Calls')
    expect(md).toContain('$0.025')
    expect(md).toContain('10.0s')
  })
})
