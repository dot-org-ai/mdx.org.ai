import { getAuthToken, authHeaders } from '../auth/index.js'
import { runSession } from '../runner/index.js'

export interface RunOptions {
  cwd?: string
  model?: string
  mode?: 'local' | 'native' | 'sandbox'
  baseUrl?: string
}

/**
 * Run a Claude session
 */
export async function runCommand(prompt: string, options: RunOptions = {}): Promise<void> {
  const baseUrl = options.baseUrl ?? 'https://agents.do'

  try {
    // Get auth token
    const token = await getAuthToken()

    // Create session on service
    console.log('Creating session...')
    const response = await fetch(`${baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({
        prompt,
        cwd: options.cwd,
        model: options.model,
        mode: options.mode ?? 'local',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`)
    }

    const { sessionId } = await response.json()

    console.log(`Session ID: ${sessionId}`)
    console.log(`Dashboard: ${baseUrl}/sessions/${sessionId}`)
    console.log()

    if (options.mode === 'local' || !options.mode) {
      console.log('Running Claude locally and streaming to service...')
      console.log()

      await runSession(
        {
          sessionId,
          prompt,
          cwd: options.cwd,
          model: options.model,
          mode: 'local',
        },
        token,
        baseUrl
      )

      console.log()
      console.log('Session completed!')
    } else {
      console.log(`Session will run in ${options.mode} mode`)
      console.log(`Watch progress at: ${baseUrl}/sessions/${sessionId}`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
