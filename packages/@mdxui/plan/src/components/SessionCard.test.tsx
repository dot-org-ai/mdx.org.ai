import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SessionCard } from './SessionCard'
import type { SessionState } from '../lib/client'

// Mock the useSession hook
vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(),
}))

import { useSession } from '../hooks/useSession'

const mockUseSession = vi.mocked(useSession)

describe('SessionCard', () => {
  const createMockState = (overrides: Partial<SessionState> = {}): SessionState => ({
    id: 'session-123',
    status: 'running',
    model: 'claude-3-opus',
    cwd: '/home/user/project',
    startedAt: '2024-01-01T00:00:00Z',
    plan: [],
    todos: [],
    tools: [],
    messages: [],
    cost: 0.05,
    duration: 5000,
    usage: {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton when state is null', () => {
    mockUseSession.mockReturnValue({
      state: null,
      error: null,
      isConnected: true,
    })

    const { container } = render(<SessionCard sessionId="test-session" />)

    // Should show animate-pulse skeleton
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders session ID (truncated)', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({ id: 'abcdefgh-1234-5678-90ab' }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="abcdefgh-1234-5678-90ab" />)

    // Should show truncated ID (first 8 chars + ...)
    expect(screen.getByText('abcdefgh...')).toBeInTheDocument()
  })

  it('renders model name', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({ model: 'claude-3-sonnet' }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.getByText('claude-3-sonnet')).toBeInTheDocument()
  })

  it('renders status indicator', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({ status: 'running' }),
      error: null,
      isConnected: true,
    })

    const { container } = render(<SessionCard sessionId="test-session" />)

    // Running status should have blue background
    const statusBadge = container.querySelector('.bg-blue-100')
    expect(statusBadge).toBeInTheDocument()
  })

  it('renders plan viewer when plan exists', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({
        plan: [
          { id: '1', description: 'Step 1', status: 'completed' },
          { id: '2', description: 'Step 2', status: 'active' },
        ],
      }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.getByText('Execution Plan')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('does not render plan viewer when plan is empty', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({ plan: [] }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.queryByText('Execution Plan')).not.toBeInTheDocument()
  })

  it('renders todo progress', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({
        todos: [
          { content: 'Task 1', activeForm: 'Doing Task 1', status: 'completed' },
          { content: 'Task 2', activeForm: 'Doing Task 2', status: 'pending' },
        ],
      }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('does not render todo progress when todos is empty', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({ todos: [] }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.queryByText('Tasks')).not.toBeInTheDocument()
  })

  it('renders cost meter', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({
        cost: 0.15,
        duration: 30000,
        usage: {
          inputTokens: 5000,
          outputTokens: 2000,
          totalTokens: 7000,
        },
      }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.getByText('$0.15')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
    expect(screen.getByText('Token Usage')).toBeInTheDocument()
  })

  it('shows reconnecting message when not connected', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: false,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
  })

  it('does not show reconnecting message when connected', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    const { container } = render(
      <SessionCard sessionId="test-session" className="custom-class" />
    )

    const card = container.firstChild
    expect(card).toHaveClass('custom-class')
  })

  it('passes baseUrl to useSession hook', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" baseUrl="https://custom.api" />)

    expect(mockUseSession).toHaveBeenCalledWith('test-session', 'https://custom.api')
  })

  it('uses default baseUrl when not provided', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(mockUseSession).toHaveBeenCalledWith('test-session', 'https://agents.do')
  })

  it('does not show tools by default', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({
        tools: [
          {
            id: '1',
            tool: 'Read',
            input: {},
            status: 'success',
            startedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" />)

    expect(screen.queryByText('Tool Executions')).not.toBeInTheDocument()
  })

  it('shows tools when showTools is true', () => {
    mockUseSession.mockReturnValue({
      state: createMockState({
        tools: [
          {
            id: '1',
            tool: 'Read',
            input: {},
            status: 'success',
            startedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }),
      error: null,
      isConnected: true,
    })

    render(<SessionCard sessionId="test-session" showTools={true} />)

    expect(screen.getByText('Tool Executions')).toBeInTheDocument()
  })

  it('renders card with proper styling', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    const { container } = render(<SessionCard sessionId="test-session" />)

    const card = container.firstChild
    expect(card).toHaveClass('border', 'rounded-lg', 'overflow-hidden', 'shadow-sm', 'bg-white')
  })

  it('renders header with gray background', () => {
    mockUseSession.mockReturnValue({
      state: createMockState(),
      error: null,
      isConnected: true,
    })

    const { container } = render(<SessionCard sessionId="test-session" />)

    const header = container.querySelector('.bg-gray-50')
    expect(header).toBeInTheDocument()
  })
})
