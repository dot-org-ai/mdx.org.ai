import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionCard } from './SessionCard.js'
import { TodoList } from './TodoList.js'
import { ToolHistory } from './ToolHistory.js'
import type { SessionState, Todo, ToolExecution } from '../types.js'

// Mock the useSession hook - move the mock before component import
const mockUseSession = vi.fn()
vi.mock('../client/hooks.js', () => ({
  useSession: (sessionId: string, options?: unknown) => mockUseSession(sessionId, options),
}))

// Import SessionDashboard after mocking
import { SessionDashboard } from './SessionDashboard.js'

describe('React Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue(null)
  })

  describe('SessionCard', () => {
    const createMockState = (overrides: Partial<SessionState> = {}): SessionState => ({
      id: 'session-123456789',
      status: 'running',
      model: 'sonnet',
      cwd: '/test/path',
      startedAt: new Date(),
      plan: [],
      todos: [],
      tools: [],
      messages: [],
      cost: 0.05,
      duration: 5000,
      usage: { input_tokens: 100, output_tokens: 200 },
      ...overrides,
    })

    it('should render session info', () => {
      const state = createMockState()

      render(<SessionCard state={state} />)

      // The ID is truncated to first 8 chars + ...
      expect(screen.getByText(/session-/)).toBeInTheDocument()
      expect(screen.getByText('sonnet')).toBeInTheDocument()
    })

    it('should show correct status badge for idle', () => {
      const state = createMockState({ status: 'idle' })

      render(<SessionCard state={state} />)

      expect(screen.getByText('idle')).toBeInTheDocument()
    })

    it('should show correct status badge for running', () => {
      const state = createMockState({ status: 'running' })

      render(<SessionCard state={state} />)

      expect(screen.getByText('running')).toBeInTheDocument()
    })

    it('should show correct status badge for completed', () => {
      const state = createMockState({ status: 'completed' })

      render(<SessionCard state={state} />)

      expect(screen.getByText('completed')).toBeInTheDocument()
    })

    it('should show correct status badge for error', () => {
      const state = createMockState({ status: 'error' })

      render(<SessionCard state={state} />)

      expect(screen.getByText('error')).toBeInTheDocument()
    })

    it('should show task progress when todos exist', () => {
      const state = createMockState({
        todos: [
          { content: 'Task 1', activeForm: 'Doing task 1', status: 'completed' },
          { content: 'Task 2', activeForm: 'Doing task 2', status: 'in_progress' },
          { content: 'Task 3', activeForm: 'Doing task 3', status: 'pending' },
        ],
      })

      render(<SessionCard state={state} />)

      expect(screen.getByText('Tasks')).toBeInTheDocument()
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    it('should show current plan step', () => {
      const state = createMockState({
        plan: [
          { id: '1', description: 'First step', status: 'completed' },
          { id: '2', description: 'Current step', status: 'active' },
          { id: '3', description: 'Next step', status: 'pending' },
        ],
      })

      render(<SessionCard state={state} />)

      expect(screen.getByText('Current Step')).toBeInTheDocument()
      expect(screen.getByText('Current step')).toBeInTheDocument()
    })

    it('should show duration and cost when completed', () => {
      const state = createMockState({
        status: 'completed',
        duration: 5000,
        cost: 0.0512,
      })

      render(<SessionCard state={state} />)

      expect(screen.getByText('Duration: 5s')).toBeInTheDocument()
      expect(screen.getByText('Cost: $0.0512')).toBeInTheDocument()
    })

    it('should not show duration when not completed', () => {
      const state = createMockState({
        status: 'running',
        duration: 5000,
        cost: 0.05,
      })

      render(<SessionCard state={state} />)

      expect(screen.queryByText(/Duration:/)).not.toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const state = createMockState()

      const { container } = render(<SessionCard state={state} className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('SessionDashboard', () => {
    it('should render title', () => {
      render(<SessionDashboard sessionIds={[]} />)

      expect(screen.getByText('Agent Sessions')).toBeInTheDocument()
    })

    it('should render multiple session cards', () => {
      mockUseSession.mockReturnValue({
        id: 'session-123',
        status: 'running',
        model: 'sonnet',
        cwd: '/test',
        startedAt: new Date(),
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
        usage: { input_tokens: 0, output_tokens: 0 },
      })

      render(<SessionDashboard sessionIds={['session-1', 'session-2', 'session-3']} />)

      // Should render 3 session cards (all with same mock state showing model)
      expect(screen.getAllByText('sonnet')).toHaveLength(3)
    })

    it('should show loading state when session is null', () => {
      mockUseSession.mockReturnValue(null)

      const { container } = render(<SessionDashboard sessionIds={['session-1']} />)

      // Should show loading skeleton
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const { container } = render(
        <SessionDashboard sessionIds={[]} className="custom-dashboard" />
      )

      expect(container.firstChild).toHaveClass('custom-dashboard')
    })
  })

  describe('TodoList', () => {
    it('should render todos with correct markers', () => {
      const todos: Todo[] = [
        { content: 'Pending task', activeForm: 'Working', status: 'pending' },
        { content: 'In progress task', activeForm: 'Working', status: 'in_progress' },
        { content: 'Completed task', activeForm: 'Working', status: 'completed' },
      ]

      render(<TodoList todos={todos} />)

      expect(screen.getByText('[ ]')).toBeInTheDocument()
      expect(screen.getByText('[-]')).toBeInTheDocument()
      expect(screen.getByText('[x]')).toBeInTheDocument()
    })

    it('should render todo content', () => {
      const todos: Todo[] = [
        { content: 'Task one', activeForm: 'Working', status: 'pending' },
        { content: 'Task two', activeForm: 'Working', status: 'completed' },
      ]

      render(<TodoList todos={todos} />)

      expect(screen.getByText('Task one')).toBeInTheDocument()
      expect(screen.getByText('Task two')).toBeInTheDocument()
    })

    it('should return null for empty list', () => {
      const { container } = render(<TodoList todos={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render title', () => {
      const todos: Todo[] = [
        { content: 'Task', activeForm: 'Working', status: 'pending' },
      ]

      render(<TodoList todos={todos} />)

      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const todos: Todo[] = [
        { content: 'Task', activeForm: 'Working', status: 'pending' },
      ]

      const { container } = render(<TodoList todos={todos} className="custom-todo" />)

      expect(container.firstChild).toHaveClass('custom-todo')
    })

    it('should apply line-through style for completed tasks', () => {
      const todos: Todo[] = [
        { content: 'Completed task', activeForm: 'Working', status: 'completed' },
      ]

      render(<TodoList todos={todos} />)

      const todoItem = screen.getByText('Completed task')
      expect(todoItem).toHaveClass('line-through')
    })
  })

  describe('ToolHistory', () => {
    const createMockTool = (overrides: Partial<ToolExecution> = {}): ToolExecution => ({
      id: 'tool-1',
      tool: 'Read',
      input: { file_path: '/test/file.ts' },
      output: 'file contents',
      status: 'success',
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-01T00:00:00.100Z'),
      ...overrides,
    })

    it('should render tool executions', () => {
      const tools: ToolExecution[] = [
        createMockTool({ tool: 'Read' }),
        createMockTool({ id: 'tool-2', tool: 'Write' }),
      ]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('Read')).toBeInTheDocument()
      expect(screen.getByText('Write')).toBeInTheDocument()
    })

    it('should return null for empty tools', () => {
      const { container } = render(<ToolHistory tools={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should show title', () => {
      const tools: ToolExecution[] = [createMockTool()]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('Tool Executions')).toBeInTheDocument()
    })

    it('should show running status symbol', () => {
      const tools: ToolExecution[] = [createMockTool({ status: 'running' })]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('should show success status symbol', () => {
      const tools: ToolExecution[] = [createMockTool({ status: 'success' })]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('should show error status symbol', () => {
      const tools: ToolExecution[] = [createMockTool({ status: 'error' })]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('✗')).toBeInTheDocument()
    })

    it('should expand to show input/output on click', () => {
      const tools: ToolExecution[] = [
        createMockTool({
          input: { file_path: '/test/path.ts' },
          output: 'test output',
        }),
      ]

      render(<ToolHistory tools={tools} />)

      // Click to expand
      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Input')).toBeInTheDocument()
      expect(screen.getByText('Output')).toBeInTheDocument()
      expect(screen.getByText(/test output/)).toBeInTheDocument()
    })

    it('should show duration when completed', () => {
      const tools: ToolExecution[] = [
        createMockTool({
          startedAt: new Date('2024-01-01T00:00:00Z'),
          completedAt: new Date('2024-01-01T00:00:00.150Z'),
        }),
      ]

      render(<ToolHistory tools={tools} />)

      expect(screen.getByText('150ms')).toBeInTheDocument()
    })

    it('should toggle expand/collapse', () => {
      const tools: ToolExecution[] = [createMockTool()]

      render(<ToolHistory tools={tools} />)

      const button = screen.getByRole('button')

      // Initially collapsed
      expect(screen.getByText('▶')).toBeInTheDocument()

      // Click to expand
      fireEvent.click(button)
      expect(screen.getByText('▼')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(button)
      expect(screen.getByText('▶')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const tools: ToolExecution[] = [createMockTool()]

      const { container } = render(<ToolHistory tools={tools} className="custom-history" />)

      expect(container.firstChild).toHaveClass('custom-history')
    })
  })
})
