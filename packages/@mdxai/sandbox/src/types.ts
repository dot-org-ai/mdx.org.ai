import { z } from 'zod'

/**
 * Configuration for sandbox execution
 */
export const SandboxConfigSchema = z.object({
  sessionId: z.string().describe('Session ID for event reporting'),
  prompt: z.string().describe('Prompt to pass to Claude Code'),
  repo: z.string().url().optional().describe('Git repository URL to clone'),
  branch: z.string().optional().describe('Git branch to checkout'),
  cwd: z.string().optional().describe('Working directory relative to /workspace'),
  model: z.string().default('sonnet').describe('Claude model to use'),
  files: z.record(z.string(), z.string()).optional().describe('Initial files to write'),
  env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
  timeout: z.number().default(600000).describe('Execution timeout in milliseconds'),
})

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>

/**
 * Sandbox process handle
 */
export interface SandboxProcess {
  pid: number
  stdout: ReadableStream<Uint8Array>
  stderr: ReadableStream<Uint8Array>
  exitCode: Promise<number>
  kill: () => Promise<void>
}

/**
 * Sandbox execution result
 */
export interface SandboxResult {
  sessionId: string
  exitCode: number
  startedAt: Date
  completedAt: Date
  duration: number
  error?: string
}

/**
 * Stream event types from Claude Code --output-format stream-json
 */
export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('assistant'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('tool_use'),
    tool: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal('tool_result'),
    tool_use_id: z.string().optional(),
    output: z.unknown(),
  }),
  z.object({
    type: z.literal('result'),
    usage: z.object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
    }).optional(),
    stop_reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
    details: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('complete'),
    exitCode: z.number(),
  }),
])

export type StreamEvent = z.infer<typeof StreamEventSchema>

/**
 * Sandbox binding types (placeholder for @cloudflare/sandbox)
 *
 * Note: This is a placeholder interface. The actual @cloudflare/sandbox
 * package may have different APIs. Update this when the official package
 * is available.
 */
export interface SandboxBinding {
  exec(command: string, options?: ExecOptions): Promise<SandboxProcess>
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  exists(path: string): Promise<boolean>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
}

export interface ExecOptions {
  cwd?: string
  env?: Record<string, string>
  stream?: boolean
  timeout?: number
}
