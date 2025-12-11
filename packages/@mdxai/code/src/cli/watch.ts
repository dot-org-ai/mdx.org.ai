import { SessionClient } from '../client/websocket.js'
import { getAuthToken } from '../auth/index.js'
import type { SessionState } from '../types.js'

export interface WatchOptions {
  baseUrl?: string
}

/**
 * Watch a session in the terminal
 */
export async function watchCommand(sessionId: string, options: WatchOptions = {}): Promise<void> {
  const baseUrl = options.baseUrl ?? 'https://agents.do'

  try {
    const token = await getAuthToken()

    console.log(`Watching session: ${sessionId}`)
    console.log(`Dashboard: ${baseUrl}/sessions/${sessionId}`)
    console.log()

    const client = new SessionClient({
      sessionId,
      baseUrl,
      authToken: token,
    })

    client.onState((state) => {
      renderTerminalState(state)
    })

    client.connect()

    // Keep process alive
    await new Promise(() => {})
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

/**
 * Render session state in the terminal
 */
function renderTerminalState(state: SessionState): void {
  // Clear screen
  console.clear()

  // Header
  console.log(`Session: ${state.id}`)
  console.log(`Status: ${state.status.toUpperCase()}`)
  console.log(`Model: ${state.model}`)
  console.log()

  // Todos
  if (state.todos.length > 0) {
    console.log('Tasks:')
    for (const todo of state.todos) {
      const symbol =
        todo.status === 'completed' ? '[x]' : todo.status === 'in_progress' ? '[-]' : '[ ]'
      console.log(`  ${symbol} ${todo.content}`)
    }
    console.log()
  }

  // Current step
  const activeStep = state.plan.find((s) => s.status === 'active')
  if (activeStep) {
    console.log(`Current: ${activeStep.description}`)
    console.log()
  }

  // Tools
  if (state.tools.length > 0) {
    const runningTools = state.tools.filter((t) => t.status === 'running')
    if (runningTools.length > 0) {
      console.log('Running:')
      for (const tool of runningTools) {
        console.log(`  - ${tool.tool}`)
      }
      console.log()
    }
  }

  // Footer
  if (state.status === 'completed') {
    console.log(`Duration: ${Math.round(state.duration / 1000)}s`)
    console.log(`Cost: $${state.cost.toFixed(4)}`)
    console.log()
    console.log('Session completed!')
    process.exit(0)
  }
}
