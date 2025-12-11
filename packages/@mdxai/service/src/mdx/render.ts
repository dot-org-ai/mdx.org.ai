/**
 * MDX rendering utilities
 *
 * Converts SessionState to MDX documents with semantic components.
 * The MDX can be rendered to various formats (HTML, Markdown, React, etc.)
 */

import type { SessionState, PlanStep, Todo, ToolExecution } from '../types'

/**
 * Render session state to MDX
 *
 * Creates an MDX document with:
 * - YAML-LD frontmatter
 * - Semantic component usage
 * - Structured data representation
 */
export function renderSessionMDX(state: SessionState): string {
  const frontmatter = renderFrontmatter(state)
  const body = renderBody(state)

  return `${frontmatter}

${body}
`
}

/**
 * Render YAML-LD frontmatter
 */
function renderFrontmatter(state: SessionState): string {
  return `---
$type: AgentSession
$id: ${state.id}
status: ${state.status}
model: ${state.model}
executionMode: ${state.executionMode || 'local'}
startedAt: ${state.startedAt.toISOString()}
${state.completedAt ? `completedAt: ${state.completedAt.toISOString()}` : ''}
cost: ${state.cost}
duration: ${state.duration}
---`
}

/**
 * Render MDX body with components
 */
function renderBody(state: SessionState): string {
  const sections = []

  // Session header
  sections.push(renderSessionHeader(state))

  // Plan steps
  if (state.plan.length > 0) {
    sections.push(renderProjectPlan(state.plan))
  }

  // Todos
  if (state.todos.length > 0) {
    sections.push(renderTodoList(state.todos))
  }

  // Tool history
  if (state.tools.length > 0) {
    sections.push(renderToolHistory(state.tools))
  }

  // Session footer
  sections.push(renderSessionFooter(state))

  return sections.join('\n\n')
}

/**
 * Render SessionHeader component
 */
function renderSessionHeader(state: SessionState): string {
  return `<SessionHeader
  status="${state.status}"
  model="${state.model}"
  sessionId="${state.id}"
  ${state.cwd ? `cwd="${state.cwd}"` : ''}
/>`
}

/**
 * Render ProjectPlan component
 */
function renderProjectPlan(steps: PlanStep[]): string {
  const stepsJson = JSON.stringify(steps, null, 2)
  return `<ProjectPlan steps={${stepsJson}} />`
}

/**
 * Render TodoList component
 */
function renderTodoList(todos: Todo[]): string {
  const todosJson = JSON.stringify(todos, null, 2)
  return `<TodoList todos={${todosJson}} />`
}

/**
 * Render ToolHistory component
 */
function renderToolHistory(tools: ToolExecution[]): string {
  // Sanitize tools for JSON serialization
  const serializedTools = tools.map(t => ({
    id: t.id,
    tool: t.tool,
    input: t.input,
    output: t.output ? truncateOutput(t.output) : undefined,
    status: t.status,
    startedAt: t.startedAt.toISOString(),
    completedAt: t.completedAt?.toISOString(),
    duration: t.duration,
    error: t.error,
  }))

  const toolsJson = JSON.stringify(serializedTools, null, 2)
  return `<ToolHistory tools={${toolsJson}} />`
}

/**
 * Render SessionFooter component
 */
function renderSessionFooter(state: SessionState): string {
  return `<SessionFooter
  cost={${state.cost}}
  duration={${state.duration}}
  usage={${JSON.stringify(state.usage)}}
/>`
}

/**
 * Truncate tool output for display
 *
 * For objects, we truncate by limiting the string representation
 * and returning a wrapper object that indicates truncation.
 */
function truncateOutput(output: unknown, maxLength = 1000): unknown {
  if (typeof output === 'string') {
    return output.length > maxLength ? output.slice(0, maxLength) + '...' : output
  }

  if (typeof output === 'object' && output !== null) {
    const json = JSON.stringify(output)
    if (json.length > maxLength) {
      // Return a valid object indicating truncation, with a preview of the content
      const preview = json.slice(0, maxLength)
      return {
        _truncated: true,
        _originalLength: json.length,
        _preview: preview + '...',
      }
    }
  }

  return output
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Format cost in USD
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}
