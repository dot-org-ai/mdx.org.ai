import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToolTimeline } from './ToolTimeline'
import type { ToolExecution } from '../lib/client'

describe('ToolTimeline', () => {
  const createTool = (overrides: Partial<ToolExecution> = {}): ToolExecution => ({
    id: 'tool-1',
    tool: 'Read',
    input: { file_path: '/test/file.ts' },
    output: 'File contents here',
    status: 'success',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    ...overrides,
  })

  it('renders null when tools is empty', () => {
    const { container } = render(<ToolTimeline tools={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when tools is undefined', () => {
    // @ts-expect-error testing undefined case
    const { container } = render(<ToolTimeline tools={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tool executions list', () => {
    const tools: ToolExecution[] = [
      createTool({ id: '1', tool: 'Read' }),
      createTool({ id: '2', tool: 'Write' }),
      createTool({ id: '3', tool: 'Bash' }),
    ]
    render(<ToolTimeline tools={tools} />)

    expect(screen.getByText('Read')).toBeInTheDocument()
    expect(screen.getByText('Write')).toBeInTheDocument()
    expect(screen.getByText('Bash')).toBeInTheDocument()
  })

  it('renders "Tool Executions" heading', () => {
    const tools = [createTool()]
    render(<ToolTimeline tools={tools} />)
    expect(screen.getByText('Tool Executions')).toBeInTheDocument()
  })

  it('has expandable details for each tool', () => {
    const tools = [
      createTool({
        tool: 'Read',
        input: { file_path: '/test/file.ts' },
        output: 'File contents',
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    // Initially, Input/Output sections should not be visible
    expect(screen.queryByText('Input')).not.toBeInTheDocument()

    // Click to expand
    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Now Input/Output should be visible
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows running spinner for in-progress tools', () => {
    const tools = [createTool({ status: 'running' })]
    const { container } = render(<ToolTimeline tools={tools} />)

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('text-blue-500')
  })

  it('shows check for successful tools', () => {
    const tools = [createTool({ status: 'success' })]
    const { container } = render(<ToolTimeline tools={tools} />)

    const checkIcon = container.querySelector('.text-green-500')
    expect(checkIcon).toBeInTheDocument()
  })

  it('shows X for failed tools', () => {
    const tools = [createTool({ status: 'error' })]
    const { container } = render(<ToolTimeline tools={tools} />)

    const errorIcon = container.querySelector('.text-red-500')
    expect(errorIcon).toBeInTheDocument()
  })

  it('shows duration when completed', () => {
    const tools = [
      createTool({
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:00:02Z', // 2 seconds later
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    expect(screen.getByText('2s')).toBeInTheDocument()
  })

  it('does not show duration for running tools', () => {
    const tools = [
      createTool({
        status: 'running',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: undefined,
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    // Should not have any duration displayed
    expect(screen.queryByText(/^\d+s$/)).not.toBeInTheDocument()
  })

  it('shows tool input when expanded', () => {
    const tools = [
      createTool({
        tool: 'Read',
        input: { file_path: '/test/specific-file.ts' },
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    // Expand the tool
    fireEvent.click(screen.getByRole('button'))

    // Should show the input JSON
    expect(screen.getByText(/specific-file\.ts/)).toBeInTheDocument()
  })

  it('shows tool output when expanded', () => {
    const tools = [
      createTool({
        tool: 'Read',
        output: 'This is the file output content',
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    // Expand the tool
    fireEvent.click(screen.getByRole('button'))

    // Should show the output
    expect(screen.getByText('This is the file output content')).toBeInTheDocument()
  })

  it('truncates long output', () => {
    const longOutput = 'x'.repeat(1500)
    const tools = [
      createTool({
        output: longOutput,
      }),
    ]
    render(<ToolTimeline tools={tools} />)

    // Expand the tool
    fireEvent.click(screen.getByRole('button'))

    // Should show truncation indicator
    expect(screen.getByText(/truncated/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const tools = [createTool()]
    const { container } = render(<ToolTimeline tools={tools} className="custom-class" />)

    const timeline = container.querySelector('.tool-timeline')
    expect(timeline).toHaveClass('custom-class')
  })

  it('toggles expansion on click', () => {
    const tools = [createTool()]
    render(<ToolTimeline tools={tools} />)

    const button = screen.getByRole('button')

    // Initially collapsed
    expect(screen.queryByText('Input')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(button)
    expect(screen.getByText('Input')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(button)
    expect(screen.queryByText('Input')).not.toBeInTheDocument()
  })

  it('shows running background for running tools', () => {
    const tools = [createTool({ status: 'running' })]
    const { container } = render(<ToolTimeline tools={tools} />)

    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-blue-50')
  })

  it('shows error background for failed tools', () => {
    const tools = [createTool({ status: 'error' })]
    const { container } = render(<ToolTimeline tools={tools} />)

    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-red-50')
  })
})
