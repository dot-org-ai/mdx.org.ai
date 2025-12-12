import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostMeter } from './CostMeter'
import type { Usage } from '../lib/client'

describe('CostMeter', () => {
  it('displays cost in dollar format', () => {
    render(<CostMeter cost={1.25} duration={5000} />)
    expect(screen.getByText('$1.25')).toBeInTheDocument()
  })

  it('displays small costs with more precision', () => {
    render(<CostMeter cost={0.0042} duration={1000} />)
    expect(screen.getByText('$0.0042')).toBeInTheDocument()
  })

  it('displays zero cost as $0.00', () => {
    render(<CostMeter cost={0} duration={1000} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('displays duration in human-readable format (seconds)', () => {
    render(<CostMeter cost={0} duration={5000} />)
    expect(screen.getByText('5s')).toBeInTheDocument()
  })

  it('displays duration in human-readable format (minutes)', () => {
    render(<CostMeter cost={0} duration={125000} />)
    expect(screen.getByText('2m 5s')).toBeInTheDocument()
  })

  it('displays duration in human-readable format (hours)', () => {
    render(<CostMeter cost={0} duration={3720000} />)
    expect(screen.getByText('1h 2m')).toBeInTheDocument()
  })

  it('displays duration in milliseconds for short durations', () => {
    render(<CostMeter cost={0} duration={500} />)
    expect(screen.getByText('500ms')).toBeInTheDocument()
  })

  it('displays token usage breakdown when usage is provided', () => {
    const usage: Usage = {
      inputTokens: 1500,
      outputTokens: 500,
      totalTokens: 2000,
    }
    render(<CostMeter cost={0.05} duration={3000} usage={usage} />)

    expect(screen.getByText('Token Usage')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
  })

  it('does not display token usage when usage is not provided', () => {
    render(<CostMeter cost={0.05} duration={3000} />)
    expect(screen.queryByText('Token Usage')).not.toBeInTheDocument()
  })

  it('handles zero values correctly for all fields', () => {
    const usage: Usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
    render(<CostMeter cost={0} duration={0} usage={usage} />)

    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText('0ms')).toBeInTheDocument()
    // All token values should be 0
    const zeroTokens = screen.getAllByText('0')
    expect(zeroTokens.length).toBe(3) // input, output, total
  })

  it('applies custom className', () => {
    const { container } = render(<CostMeter cost={0} duration={0} className="custom-class" />)
    const costMeter = container.querySelector('.cost-meter')
    expect(costMeter).toHaveClass('custom-class')
  })

  it('displays Cost label', () => {
    render(<CostMeter cost={1} duration={1000} />)
    expect(screen.getByText('Cost')).toBeInTheDocument()
  })

  it('displays Duration label', () => {
    render(<CostMeter cost={1} duration={1000} />)
    expect(screen.getByText('Duration')).toBeInTheDocument()
  })

  it('formats large token counts with commas', () => {
    const usage: Usage = {
      inputTokens: 1234567,
      outputTokens: 89012,
      totalTokens: 1323579,
    }
    render(<CostMeter cost={0.5} duration={5000} usage={usage} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('89,012')).toBeInTheDocument()
    expect(screen.getByText('1,323,579')).toBeInTheDocument()
  })

  it('renders with dollar sign icon container', () => {
    const { container } = render(<CostMeter cost={1} duration={1000} />)
    const dollarContainer = container.querySelector('.bg-green-100')
    expect(dollarContainer).toBeInTheDocument()
  })

  it('renders with clock icon container', () => {
    const { container } = render(<CostMeter cost={1} duration={1000} />)
    const clockContainer = container.querySelector('.bg-blue-100')
    expect(clockContainer).toBeInTheDocument()
  })

  it('renders token usage section with proper separator', () => {
    const usage: Usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    }
    const { container } = render(<CostMeter cost={0.01} duration={1000} usage={usage} />)

    // Should have border-t separator
    const tokenSection = container.querySelector('.border-t')
    expect(tokenSection).toBeInTheDocument()
  })
})
