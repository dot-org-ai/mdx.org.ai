import { spawnClaude } from './spawn.js'
import { parseStreamLines } from './parser.js'
import { EventReporter } from './reporter.js'
import type { SessionConfig } from '../types.js'

/**
 * Run a Claude session locally and stream events to the service
 */
export async function runSession(config: SessionConfig, authToken: string, baseUrl = 'https://agents.do'): Promise<void> {
  const proc = spawnClaude({
    prompt: config.prompt,
    cwd: config.cwd,
    model: config.model,
  })

  const reporter = new EventReporter({
    sessionId: config.sessionId,
    baseUrl,
    authToken,
  })

  // Handle stdout (stream-json events)
  proc.stdout?.on('data', async (chunk: Buffer) => {
    const text = chunk.toString()
    for (const event of parseStreamLines(text)) {
      await reporter.send(event)
    }
  })

  // Handle stderr (errors and logs)
  proc.stderr?.on('data', (chunk: Buffer) => {
    console.error(chunk.toString())
  })

  // Handle process exit
  return new Promise((resolve, reject) => {
    proc.on('close', async (code) => {
      if (code === 0) {
        await reporter.sendComplete(code)
        resolve()
      } else {
        await reporter.sendComplete(code ?? -1)
        reject(new Error(`Process exited with code ${code}`))
      }
    })

    proc.on('error', async (error) => {
      await reporter.sendError(error)
      reject(error)
    })
  })
}

export { spawnClaude, buildClaudeArgs } from './spawn.js'
export { parseStreamJson, parseStreamLines } from './parser.js'
export { EventReporter } from './reporter.js'
