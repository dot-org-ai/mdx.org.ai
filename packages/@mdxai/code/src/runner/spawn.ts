import { spawn, type ChildProcess } from 'node:child_process'
import type { SpawnOptions } from '../types.js'

/**
 * Build the argument array for spawning Claude CLI
 */
export function buildClaudeArgs(options: SpawnOptions): string[] {
  return [
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
}

/**
 * Spawn a Claude CLI process with stream-json output
 */
export function spawnClaude(options: SpawnOptions): ChildProcess {
  const args = buildClaudeArgs(options)

  return spawn('pnpm', args, {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  })
}
