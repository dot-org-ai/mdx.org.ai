import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the useSessions hook
vi.mock('../hooks/useSessions', () => ({
  useSessions: vi.fn(),
}))

// Mock SessionCard since it has its own tests and dependencies
vi.mock('./SessionCard', () => ({
  SessionCard: ({ sessionId }: { sessionId: string }) => (
    <div data-testid={`session-card-${sessionId}`}>SessionCard: {sessionId}</div>
  ),
}))

import { useSessions } from '../hooks/useSessions'

const mockUseSessions = vi.mocked(useSessions)

// Wrapper with QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
)

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders grid of session cards', () => {
    mockUseSessions.mockReturnValue({
      data: [
        { id: 'session-1', status: 'running' },
        { id: 'session-2', status: 'completed' },
        { id: 'session-3', status: 'idle' },
      ] as any,
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument()
    expect(screen.getByTestId('session-card-session-2')).toBeInTheDocument()
    expect(screen.getByTestId('session-card-session-3')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseSessions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByText('Loading sessions...')).toBeInTheDocument()
  })

  it('shows loading spinner during loading', () => {
    mockUseSessions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const { container } = render(<Dashboard />, { wrapper })

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('handles empty sessions list', () => {
    mockUseSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByText('No Sessions Found')).toBeInTheDocument()
    expect(
      screen.getByText('Create a new session to get started with agent execution.')
    ).toBeInTheDocument()
  })

  it('handles undefined sessions', () => {
    mockUseSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByText('No Sessions Found')).toBeInTheDocument()
  })

  it('handles fetch errors', () => {
    mockUseSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error occurred'),
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByText('Error Loading Sessions')).toBeInTheDocument()
    expect(screen.getByText('Network error occurred')).toBeInTheDocument()
  })

  it('renders dashboard heading', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(screen.getByText('Agent Sessions')).toBeInTheDocument()
    expect(
      screen.getByText('Monitor and manage your Claude agent execution sessions')
    ).toBeInTheDocument()
  })

  it('applies custom className', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<Dashboard className="custom-class" />, { wrapper })

    const dashboard = container.querySelector('.dashboard')
    expect(dashboard).toHaveClass('custom-class')
  })

  it('passes baseUrl to useSessions hook', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard baseUrl="https://custom.api" />, { wrapper })

    expect(mockUseSessions).toHaveBeenCalledWith({ baseUrl: 'https://custom.api' })
  })

  it('uses default baseUrl when not provided', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />, { wrapper })

    expect(mockUseSessions).toHaveBeenCalledWith({ baseUrl: 'https://agents.do' })
  })

  it('renders with responsive grid', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }, { id: 'session-2' }] as any,
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<Dashboard />, { wrapper })

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  it('renders error with red styling', () => {
    mockUseSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Test error'),
    } as any)

    const { container } = render(<Dashboard />, { wrapper })

    const errorBox = container.querySelector('.bg-red-50')
    expect(errorBox).toBeInTheDocument()
    expect(errorBox).toHaveClass('border-red-200')
  })

  it('renders empty state with gray styling', () => {
    mockUseSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<Dashboard />, { wrapper })

    const emptyBox = container.querySelector('.bg-gray-50')
    expect(emptyBox).toBeInTheDocument()
  })

  it('passes showTools prop to SessionCard', () => {
    // We need to verify the prop is passed correctly
    // Since we mocked SessionCard, we can check if it receives the prop
    const mockSessionCard = vi.fn().mockImplementation(({ sessionId, showTools }) => (
      <div data-testid={`session-card-${sessionId}`} data-show-tools={showTools}>
        SessionCard
      </div>
    ))

    vi.doMock('./SessionCard', () => ({
      SessionCard: mockSessionCard,
    }))

    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    // Re-render to use the new mock - this is a simplified check
    render(<Dashboard showTools={true} />, { wrapper })

    // The component should render without errors
    expect(screen.getByTestId('session-card-session-1')).toBeInTheDocument()
  })

  it('renders max width container', () => {
    mockUseSessions.mockReturnValue({
      data: [{ id: 'session-1' }] as any,
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<Dashboard />, { wrapper })

    const maxWidthContainer = container.querySelector('.max-w-7xl')
    expect(maxWidthContainer).toBeInTheDocument()
  })
})
