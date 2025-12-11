import { spawn, type ChildProcess } from 'node:child_process'
import type { SpawnOptions } from '../types.js'

/**
 * Spawn a Claude CLI process with stream-json output
 */
export function spawnClaude(options: SpawnOptions): ChildProcess {
  const args = [
    'claude',
    '--output-format',
    'stream-json',
    '--print',
    'assistant,result,tool_use,tool_result',
    '--model',
    options.model ?? 'sonnet',
    '-p',
    options.prompt,
  ]

  return spawn('pnpm', args, {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  })
}
