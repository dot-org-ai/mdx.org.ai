/**
 * GitHub-specific Markdown rendering
 *
 * Customized Markdown rendering optimized for GitHub comments and issues.
 */

import type { SessionState } from '../types'
import { markdownComponents } from './components'

/**
 * Render session state to GitHub-flavored Markdown
 *
 * Optimized for GitHub PR comments and issue updates.
 */
export function toGitHubMarkdown(state: SessionState): string {
  const sections = []

  // Header
  sections.push(markdownComponents.SessionHeader({
    status: state.status,
    model: state.model,
    sessionId: state.id,
    cwd: state.cwd,
  }))

  // Plan
  if (state.plan.length > 0) {
    sections.push(markdownComponents.ProjectPlan({
      steps: state.plan,
    }))
  }

  // Todos
  if (state.todos.length > 0) {
    sections.push(markdownComponents.TodoList({
      todos: state.todos,
    }))
  }

  // Tools (collapsed by default in GitHub)
  if (state.tools.length > 0) {
    sections.push(markdownComponents.ToolHistory({
      tools: state.tools,
    }))
  }

  // Footer
  sections.push(markdownComponents.SessionFooter({
    cost: state.cost,
    duration: state.duration,
    usage: state.usage,
  }))

  return sections.filter(Boolean).join('\n\n')
}

/**
 * Create a GitHub comment update
 *
 * Formats the session state as a GitHub comment with proper structure.
 */
export function createGitHubComment(state: SessionState): string {
  const markdown = toGitHubMarkdown(state)

  // Add attribution footer
  return `${markdown}

---
*Updated by [agents.do](https://agents.do) • Session: [\`${state.id.slice(0, 8)}\`](https://agents.do/sessions/${state.id})*`
}

/**
 * Create a minimal status update for GitHub
 *
 * Useful for frequent updates without overwhelming the comment.
 */
export function createMinimalUpdate(state: SessionState): string {
  const statusEmoji = {
    idle: '⏸️',
    running: '▶️',
    completed: '✅',
    error: '❌',
  }[state.status]

  const completed = state.todos.filter(t => t.status === 'completed').length
  const total = state.todos.length

  return `${statusEmoji} **${state.status}** | Tasks: ${completed}/${total} | Tools: ${state.tools.length} | Cost: $${state.cost.toFixed(4)}`
}
