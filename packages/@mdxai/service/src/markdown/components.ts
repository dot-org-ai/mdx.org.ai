/**
 * Markdown component renderers
 *
 * Renders SessionState components to plain Markdown.
 * Can be customized for different platforms (GitHub, Slack, etc.)
 */

import type {
  SessionHeaderProps,
  ProjectPlanProps,
  TodoListProps,
  ToolHistoryProps,
  SessionFooterProps,
} from '../mdx/components'
import { formatDuration, formatCost } from '../mdx/render'

/**
 * Status emoji mapping
 */
const STATUS_EMOJI = {
  idle: '⏸️',
  running: '▶️',
  completed: '✅',
  error: '❌',
} as const

/**
 * Step status emoji mapping
 */
const STEP_EMOJI = {
  pending: '⭕',
  active: '▶️',
  completed: '✅',
  skipped: '⏭️',
} as const

/**
 * Tool status emoji mapping
 */
const TOOL_EMOJI = {
  running: '⏳',
  success: '✅',
  error: '❌',
} as const

/**
 * Render SessionHeader as Markdown
 */
export function renderSessionHeader(props: SessionHeaderProps): string {
  return `## ${STATUS_EMOJI[props.status]} Claude Agent Session

| Status | Model | Session ID |
|--------|-------|------------|
| ${props.status} | ${props.model} | \`${props.sessionId.slice(0, 8)}...\` |
${props.cwd ? `| **CWD** | \`${props.cwd}\` | |` : ''}`
}

/**
 * Render ProjectPlan as Markdown
 */
export function renderProjectPlan(props: ProjectPlanProps): string {
  if (props.steps.length === 0) {
    return ''
  }

  const stepsList = props.steps
    .map((step, i) => {
      const emoji = STEP_EMOJI[step.status]
      return `${emoji} **${i + 1}.** ${step.description}`
    })
    .join('\n')

  return `### 📋 Plan

${stepsList}`
}

/**
 * Render TodoList as Markdown
 */
export function renderTodoList(props: TodoListProps): string {
  if (props.todos.length === 0) {
    return ''
  }

  const todosList = props.todos
    .map(todo => {
      const marker = todo.status === 'completed' ? 'x' : todo.status === 'in_progress' ? '-' : ' '
      return `- [${marker}] ${todo.content}`
    })
    .join('\n')

  const completed = props.todos.filter(t => t.status === 'completed').length
  const total = props.todos.length

  return `### ✅ Tasks (${completed}/${total})

${todosList}`
}

/**
 * Render ToolHistory as Markdown
 */
export function renderToolHistory(props: ToolHistoryProps): string {
  if (props.tools.length === 0) {
    return ''
  }

  const toolsList = props.tools
    .map(tool => {
      const emoji = TOOL_EMOJI[tool.status]
      const duration = tool.duration ? ` (${formatDuration(tool.duration)})` : ''

      let details = ''
      if (tool.status === 'success' && tool.output) {
        const outputStr = typeof tool.output === 'string'
          ? tool.output.slice(0, 200)
          : JSON.stringify(tool.output, null, 2).slice(0, 200)
        details = `\n\n**Output:**\n\`\`\`\n${outputStr}${outputStr.length >= 200 ? '...' : ''}\n\`\`\``
      }
      if (tool.error) {
        details = `\n\n**Error:** ${tool.error}`
      }

      return `<details>
<summary>${emoji} <code>${tool.tool}</code> ${tool.status}${duration}</summary>

**Input:**
\`\`\`json
${JSON.stringify(tool.input, null, 2).slice(0, 500)}
\`\`\`
${details}

</details>`
    })
    .join('\n\n')

  return `### 🔧 Tool Calls (${props.tools.length})

${toolsList}`
}

/**
 * Render SessionFooter as Markdown
 */
export function renderSessionFooter(props: SessionFooterProps): string {
  return `---

💰 **Cost:** ${formatCost(props.cost)} | ⏱️ **Duration:** ${formatDuration(props.duration)} | 📊 **Tokens:** ${props.usage.inputTokens + props.usage.outputTokens} (${props.usage.inputTokens} in, ${props.usage.outputTokens} out)`
}

/**
 * Component renderers map
 */
export const markdownComponents = {
  SessionHeader: renderSessionHeader,
  ProjectPlan: renderProjectPlan,
  TodoList: renderTodoList,
  ToolHistory: renderToolHistory,
  SessionFooter: renderSessionFooter,
}
