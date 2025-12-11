/**
 * Basic Sandbox Execution Example
 *
 * Demonstrates the simplest use case: execute Claude Code in a sandbox
 * and stream events to a SessionDO.
 */

import {
  executeInSandbox,
  reportSandboxEvents,
  type SandboxBinding,
} from '@mdxai/sandbox'

/**
 * Example Cloudflare Worker that executes Claude Code in a sandbox
 */
interface Env {
  SANDBOX: SandboxBinding
  AUTH_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // POST /execute - Start a new sandbox execution
    if (url.pathname === '/execute' && request.method === 'POST') {
      const config = await request.json()

      try {
        // Execute Claude Code in sandbox
        const proc = await executeInSandbox(env.SANDBOX, {
          sessionId: config.sessionId,
          prompt: config.prompt,
          repo: config.repo,
          branch: config.branch,
          model: config.model || 'sonnet',
        })

        // Stream events to SessionDO in background
        // Don't await - let it run asynchronously
        const sessionUrl = `https://agents.do/sessions/${config.sessionId}`
        reportSandboxEvents(proc, {
          sessionUrl,
          authToken: env.AUTH_TOKEN,
        }).catch(error => {
          console.error('Failed to report sandbox events:', error)
        })

        return Response.json({
          success: true,
          sessionId: config.sessionId,
          pid: proc.pid,
        })
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        )
      }
    }

    return new Response('Not found', { status: 404 })
  },
}

/**
 * Usage example (from client):
 *
 * ```typescript
 * const response = await fetch('https://sandbox.do/execute', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     sessionId: 'session-123',
 *     prompt: 'Implement user authentication',
 *     repo: 'https://github.com/user/project',
 *     branch: 'feature/auth',
 *     model: 'sonnet',
 *   }),
 * })
 *
 * const { sessionId, pid } = await response.json()
 * console.log(`Started sandbox process ${pid} for session ${sessionId}`)
 *
 * // Watch session in real-time
 * const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`)
 * ws.onmessage = (event) => {
 *   const { state } = JSON.parse(event.data)
 *   console.log('Session state:', state)
 * }
 * ```
 */
