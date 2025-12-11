/**
 * @mdxai/sandbox
 *
 * Cloudflare Sandbox execution for Claude Code
 *
 * This package provides utilities for running Claude Code in a Cloudflare Sandbox
 * environment, which provides filesystem and git access for agent operations
 * that require traditional file-based workflows.
 *
 * @example
 * ```typescript
 * import { executeInSandbox, reportSandboxEvents } from '@mdxai/sandbox'
 *
 * // Execute Claude Code in sandbox
 * const proc = await executeInSandbox(env.SANDBOX, {
 *   sessionId: 'session-123',
 *   prompt: 'Fix the bug in main.ts',
 *   repo: 'https://github.com/user/repo',
 *   branch: 'main',
 *   model: 'sonnet',
 * })
 *
 * // Stream events to SessionDO
 * await reportSandboxEvents(proc, {
 *   sessionUrl: 'https://agents.do/sessions/session-123',
 *   authToken: env.AUTH_TOKEN,
 * })
 * ```
 */

// Executor functions
export {
  executeInSandbox,
  executeAndWait,
  killSandboxProcess,
  setupSandbox,
} from './executor'

// Event reporting
export {
  SandboxReporter,
  reportSandboxEvents,
  type ReporterConfig,
} from './reporter'

// Stream parsing
export {
  parseStreamJson,
  parseStreamJsonLines,
  streamEvents,
  summarizeStreamEvents,
  type StreamSummary,
} from './stream-parser'

// Types
export {
  type SandboxConfig,
  type SandboxProcess,
  type SandboxResult,
  type StreamEvent,
  type SandboxBinding,
  type ExecOptions,
  SandboxConfigSchema,
  StreamEventSchema,
} from './types'
