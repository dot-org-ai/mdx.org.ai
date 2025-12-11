/**
 * MDX component definitions
 *
 * Type definitions and prop interfaces for MDX components used in session rendering.
 * These components are rendered by @mdxui packages.
 */

import type { SessionState, SessionStatus, PlanStep, Todo, ToolExecution, Usage } from '../types'

/**
 * SessionHeader component props
 */
export interface SessionHeaderProps {
  status: SessionStatus
  model: string
  sessionId: string
  cwd?: string
}

/**
 * ProjectPlan component props
 */
export interface ProjectPlanProps {
  steps: PlanStep[]
}

/**
 * TodoList component props
 */
export interface TodoListProps {
  todos: Todo[]
}

/**
 * ToolHistory component props
 */
export interface ToolHistoryProps {
  tools: ToolExecution[]
}

/**
 * SessionFooter component props
 */
export interface SessionFooterProps {
  cost: number
  duration: number
  usage: Usage
}

/**
 * Component registry
 *
 * Maps component names to their prop types.
 * Used for type-safe MDX rendering.
 */
export interface ComponentRegistry {
  SessionHeader: SessionHeaderProps
  ProjectPlan: ProjectPlanProps
  TodoList: TodoListProps
  ToolHistory: ToolHistoryProps
  SessionFooter: SessionFooterProps
}

/**
 * Get default props for a component
 */
export function getDefaultProps<K extends keyof ComponentRegistry>(
  component: K
): Partial<ComponentRegistry[K]> {
  switch (component) {
    case 'SessionHeader':
      return {
        status: 'idle',
        model: 'claude-sonnet-4-20250514',
        sessionId: '',
      } as Partial<ComponentRegistry[K]>

    case 'ProjectPlan':
      return {
        steps: [],
      } as Partial<ComponentRegistry[K]>

    case 'TodoList':
      return {
        todos: [],
      } as Partial<ComponentRegistry[K]>

    case 'ToolHistory':
      return {
        tools: [],
      } as Partial<ComponentRegistry[K]>

    case 'SessionFooter':
      return {
        cost: 0,
        duration: 0,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      } as Partial<ComponentRegistry[K]>

    default:
      return {}
  }
}
