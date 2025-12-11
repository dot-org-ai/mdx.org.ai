import { ApiClient } from '../client/api.js'
import { getAuthToken } from '../auth/index.js'

export interface ListOptions {
  baseUrl?: string
}

/**
 * List all sessions
 */
export async function listCommand(options: ListOptions = {}): Promise<void> {
  const baseUrl = options.baseUrl ?? 'https://agents.do'

  try {
    const token = await getAuthToken()
    const client = new ApiClient({ baseUrl, authToken: token })

    console.log('Fetching sessions...')
    const sessions = await client.listSessions()

    if (sessions.length === 0) {
      console.log('No sessions found')
      return
    }

    console.log()
    console.log(`Found ${sessions.length} session(s):`)
    console.log()

    for (const session of sessions) {
      const date = new Date(session.startedAt).toLocaleString()
      const statusIcon = {
        idle: '⚪',
        running: '🔵',
        completed: '✅',
        error: '❌',
      }[session.status]

      console.log(`${statusIcon} ${session.id}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   Model: ${session.model}`)
      console.log(`   Started: ${date}`)

      if (session.todos.length > 0) {
        const completed = session.todos.filter((t) => t.status === 'completed').length
        console.log(`   Tasks: ${completed}/${session.todos.length}`)
      }

      if (session.status === 'completed') {
        console.log(`   Duration: ${Math.round(session.duration / 1000)}s`)
        console.log(`   Cost: $${session.cost.toFixed(4)}`)
      }

      console.log()
    }

    console.log(`Dashboard: ${baseUrl}/sessions`)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
