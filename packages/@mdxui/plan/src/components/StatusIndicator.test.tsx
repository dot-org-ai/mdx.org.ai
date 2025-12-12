import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('idle status shows gray badge', () => {
    const { container } = render(<StatusIndicator status="idle" />)

    const badge = container.querySelector('.bg-gray-100')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-gray-400')
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it('running status shows blue badge with animation', () => {
    const { container } = render(<StatusIndicator status="running" />)

    const badge = container.querySelector('.bg-blue-100')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-blue-500')
    expect(screen.getByText('Running')).toBeInTheDocument()

    // Should have spinning animation on the icon
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('completed status shows green badge', () => {
    const { container } = render(<StatusIndicator status="completed" />)

    const badge = container.querySelector('.bg-green-100')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-green-500')
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('error status shows red badge', () => {
    const { container } = render(<StatusIndicator status="error" />)

    const badge = container.querySelector('.bg-red-100')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-red-500')
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('shows label by default', () => {
    render(<StatusIndicator status="idle" />)
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<StatusIndicator status="idle" showLabel={false} />)
    expect(screen.queryByText('Idle')).not.toBeInTheDocument()
  })

  it('explicitly shows label when showLabel is true', () => {
    render(<StatusIndicator status="running" showLabel={true} />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<StatusIndicator status="idle" className="custom-class" />)

    const badge = container.firstChild
    expect(badge).toHaveClass('custom-class')
  })

  it('has pill/badge styling with rounded-full', () => {
    const { container } = render(<StatusIndicator status="idle" />)

    const badge = container.firstChild
    expect(badge).toHaveClass('rounded-full')
    expect(badge).toHaveClass('inline-flex')
    expect(badge).toHaveClass('items-center')
  })

  it('idle status does not have animation', () => {
    const { container } = render(<StatusIndicator status="idle" />)
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('completed status does not have animation', () => {
    const { container } = render(<StatusIndicator status="completed" />)
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('error status does not have animation', () => {
    const { container } = render(<StatusIndicator status="error" />)
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('renders with correct icon size', () => {
    const { container } = render(<StatusIndicator status="idle" />)
    const icon = container.querySelector('.w-4.h-4')
    expect(icon).toBeInTheDocument()
  })

  it('renders with proper padding', () => {
    const { container } = render(<StatusIndicator status="idle" />)
    const badge = container.firstChild
    expect(badge).toHaveClass('px-3', 'py-1')
  })

  it('renders with gap between icon and label', () => {
    const { container } = render(<StatusIndicator status="idle" />)
    const badge = container.firstChild
    expect(badge).toHaveClass('gap-2')
  })

  it('renders with medium font weight', () => {
    const { container } = render(<StatusIndicator status="idle" />)
    const badge = container.firstChild
    expect(badge).toHaveClass('font-medium')
  })

  it('renders each status with correct label text', () => {
    const { rerender } = render(<StatusIndicator status="idle" />)
    expect(screen.getByText('Idle')).toBeInTheDocument()

    rerender(<StatusIndicator status="running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()

    rerender(<StatusIndicator status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()

    rerender(<StatusIndicator status="error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })
})
