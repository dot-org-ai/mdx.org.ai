import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanViewer } from './PlanViewer'
import type { PlanStep } from '../lib/client'

describe('PlanViewer', () => {
  const createStep = (overrides: Partial<PlanStep> = {}): PlanStep => ({
    id: 'step-1',
    description: 'Test step',
    status: 'pending',
    ...overrides,
  })

  it('renders null when steps is empty', () => {
    const { container } = render(<PlanViewer steps={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when steps is undefined', () => {
    // @ts-expect-error testing undefined case
    const { container } = render(<PlanViewer steps={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders plan steps in order', () => {
    const steps: PlanStep[] = [
      createStep({ id: '1', description: 'First step' }),
      createStep({ id: '2', description: 'Second step' }),
      createStep({ id: '3', description: 'Third step' }),
    ]
    render(<PlanViewer steps={steps} />)

    expect(screen.getByText('First step')).toBeInTheDocument()
    expect(screen.getByText('Second step')).toBeInTheDocument()
    expect(screen.getByText('Third step')).toBeInTheDocument()

    // Check ordering via step numbers
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    expect(screen.getByText('3.')).toBeInTheDocument()
  })

  it('renders "Execution Plan" heading', () => {
    const steps = [createStep()]
    render(<PlanViewer steps={steps} />)
    expect(screen.getByText('Execution Plan')).toBeInTheDocument()
  })

  it('shows correct icon for pending status (Circle)', () => {
    const steps = [createStep({ status: 'pending' })]
    const { container } = render(<PlanViewer steps={steps} />)

    // Circle icon should be rendered for pending - check for text-gray-400 class
    const icon = container.querySelector('.text-gray-400')
    expect(icon).toBeInTheDocument()
  })

  it('shows correct icon for active status (Loader with animation)', () => {
    const steps = [createStep({ status: 'active' })]
    const { container } = render(<PlanViewer steps={steps} />)

    // Active status should have animate-spin class and text-blue-500
    const icon = container.querySelector('.animate-spin')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('text-blue-500')
  })

  it('shows correct icon for completed status (CheckCircle)', () => {
    const steps = [createStep({ status: 'completed' })]
    const { container } = render(<PlanViewer steps={steps} />)

    // Completed status should have text-green-500 class
    const icon = container.querySelector('.text-green-500')
    expect(icon).toBeInTheDocument()
  })

  it('shows correct icon for skipped status (MinusCircle with line-through)', () => {
    const steps = [createStep({ status: 'skipped', description: 'Skipped task' })]
    const { container } = render(<PlanViewer steps={steps} />)

    // Skipped status should have text-gray-300 and opacity-50 classes
    const icon = container.querySelector('.text-gray-300')
    expect(icon).toBeInTheDocument()

    // The container should have opacity-50
    const stepContainer = container.querySelector('.opacity-50')
    expect(stepContainer).toBeInTheDocument()
  })

  it('active step has blue highlight styling', () => {
    const steps = [createStep({ status: 'active' })]
    const { container } = render(<PlanViewer steps={steps} />)

    // Active status should have border-blue-500 and bg-blue-50
    const activeStep = container.querySelector('.border-blue-500')
    expect(activeStep).toBeInTheDocument()
    expect(activeStep).toHaveClass('bg-blue-50')
  })

  it('completed step has line-through text styling', () => {
    const steps = [createStep({ status: 'completed', description: 'Done task' })]
    const { container } = render(<PlanViewer steps={steps} />)

    const strikethroughText = container.querySelector('.line-through')
    expect(strikethroughText).toBeInTheDocument()
    expect(strikethroughText).toHaveTextContent('Done task')
  })

  it('applies custom className', () => {
    const steps = [createStep()]
    const { container } = render(<PlanViewer steps={steps} className="custom-class" />)

    const planViewer = container.querySelector('.plan-viewer')
    expect(planViewer).toHaveClass('custom-class')
  })

  it('renders multiple steps with different statuses', () => {
    const steps: PlanStep[] = [
      createStep({ id: '1', description: 'Completed task', status: 'completed' }),
      createStep({ id: '2', description: 'Active task', status: 'active' }),
      createStep({ id: '3', description: 'Pending task', status: 'pending' }),
      createStep({ id: '4', description: 'Skipped task', status: 'skipped' }),
    ]
    render(<PlanViewer steps={steps} />)

    expect(screen.getByText('Completed task')).toBeInTheDocument()
    expect(screen.getByText('Active task')).toBeInTheDocument()
    expect(screen.getByText('Pending task')).toBeInTheDocument()
    expect(screen.getByText('Skipped task')).toBeInTheDocument()
  })
})
