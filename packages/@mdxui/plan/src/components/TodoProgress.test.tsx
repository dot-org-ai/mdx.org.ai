import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodoProgress } from './TodoProgress'
import type { Todo } from '../lib/client'

describe('TodoProgress', () => {
  const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
    content: 'Test todo',
    activeForm: 'Testing todo',
    status: 'pending',
    ...overrides,
  })

  it('renders null when todos is empty', () => {
    const { container } = render(<TodoProgress todos={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when todos is undefined', () => {
    // @ts-expect-error testing undefined case
    const { container } = render(<TodoProgress todos={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders todo items with checkboxes', () => {
    const todos: Todo[] = [
      createTodo({ content: 'First task' }),
      createTodo({ content: 'Second task' }),
    ]
    render(<TodoProgress todos={todos} />)

    expect(screen.getByText('First task')).toBeInTheDocument()
    expect(screen.getByText('Second task')).toBeInTheDocument()
  })

  it('shows progress bar with correct percentage', () => {
    const todos: Todo[] = [
      createTodo({ status: 'completed' }),
      createTodo({ status: 'completed' }),
      createTodo({ status: 'pending' }),
      createTodo({ status: 'pending' }),
    ]
    const { container } = render(<TodoProgress todos={todos} />)

    // 2 out of 4 = 50%
    expect(screen.getByText('2 / 4 completed')).toBeInTheDocument()

    // Check progress bar has 50% width
    const progressBar = container.querySelector('.bg-green-500')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('shows 0% progress when nothing completed', () => {
    const todos: Todo[] = [
      createTodo({ status: 'pending' }),
      createTodo({ status: 'pending' }),
    ]
    const { container } = render(<TodoProgress todos={todos} />)

    expect(screen.getByText('0 / 2 completed')).toBeInTheDocument()

    const progressBar = container.querySelector('.bg-green-500')
    expect(progressBar).toHaveStyle({ width: '0%' })
  })

  it('shows 100% progress when all completed', () => {
    const todos: Todo[] = [
      createTodo({ status: 'completed' }),
      createTodo({ status: 'completed' }),
    ]
    const { container } = render(<TodoProgress todos={todos} />)

    expect(screen.getByText('2 / 2 completed')).toBeInTheDocument()

    const progressBar = container.querySelector('.bg-green-500')
    expect(progressBar).toHaveStyle({ width: '100%' })
  })

  it('pending todos show empty checkbox (Square icon)', () => {
    const todos = [createTodo({ status: 'pending', content: 'Pending task' })]
    const { container } = render(<TodoProgress todos={todos} />)

    // Square icon for pending should have text-gray-400 class
    const icon = container.querySelector('.text-gray-400')
    expect(icon).toBeInTheDocument()
  })

  it('in_progress todos show loading indicator (Loader2 with animation)', () => {
    const todos = [createTodo({ status: 'in_progress', activeForm: 'Working on task' })]
    const { container } = render(<TodoProgress todos={todos} />)

    // Loader2 for in_progress should have animate-spin and text-blue-500
    const icon = container.querySelector('.animate-spin')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('text-blue-500')
  })

  it('completed todos show checkmark (CheckSquare icon)', () => {
    const todos = [createTodo({ status: 'completed', content: 'Done task' })]
    const { container } = render(<TodoProgress todos={todos} />)

    // CheckSquare icon for completed should have text-green-500 class
    const icon = container.querySelector('.text-green-500')
    expect(icon).toBeInTheDocument()
  })

  it('in_progress todos display activeForm text', () => {
    const todos = [
      createTodo({
        status: 'in_progress',
        content: 'Do the thing',
        activeForm: 'Doing the thing',
      }),
    ]
    render(<TodoProgress todos={todos} />)

    // Should show activeForm, not content
    expect(screen.getByText('Doing the thing')).toBeInTheDocument()
    expect(screen.queryByText('Do the thing')).not.toBeInTheDocument()
  })

  it('pending and completed todos display content text', () => {
    const todos: Todo[] = [
      createTodo({ status: 'pending', content: 'Pending content', activeForm: 'Pending active' }),
      createTodo({ status: 'completed', content: 'Completed content', activeForm: 'Completed active' }),
    ]
    render(<TodoProgress todos={todos} />)

    expect(screen.getByText('Pending content')).toBeInTheDocument()
    expect(screen.getByText('Completed content')).toBeInTheDocument()
  })

  it('completed todos have line-through styling', () => {
    const todos = [createTodo({ status: 'completed', content: 'Done task' })]
    const { container } = render(<TodoProgress todos={todos} />)

    const strikethrough = container.querySelector('.line-through')
    expect(strikethrough).toBeInTheDocument()
    expect(strikethrough).toHaveTextContent('Done task')
  })

  it('renders Tasks heading', () => {
    const todos = [createTodo()]
    render(<TodoProgress todos={todos} />)
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const todos = [createTodo()]
    const { container } = render(<TodoProgress todos={todos} className="custom-class" />)

    const todoProgress = container.querySelector('.todo-progress')
    expect(todoProgress).toHaveClass('custom-class')
  })

  it('handles mixed statuses correctly', () => {
    const todos: Todo[] = [
      createTodo({ status: 'completed', content: 'Task 1' }),
      createTodo({ status: 'in_progress', activeForm: 'Working on Task 2' }),
      createTodo({ status: 'pending', content: 'Task 3' }),
    ]
    const { container } = render(<TodoProgress todos={todos} />)

    // 1 out of 3 completed
    expect(screen.getByText('1 / 3 completed')).toBeInTheDocument()

    // Verify all three items are rendered
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Working on Task 2')).toBeInTheDocument()
    expect(screen.getByText('Task 3')).toBeInTheDocument()

    // Verify icons
    expect(container.querySelector('.text-green-500')).toBeInTheDocument() // completed
    expect(container.querySelector('.animate-spin')).toBeInTheDocument() // in_progress
    expect(container.querySelector('.text-gray-400')).toBeInTheDocument() // pending
  })
})
