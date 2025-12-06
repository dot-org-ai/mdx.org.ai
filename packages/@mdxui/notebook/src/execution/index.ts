export { BrowserExecutor, createBrowserExecutor } from './browser'
export { RPCExecutor, createRPCExecutor, executeViaRPC } from './rpc'

export type { Executor, ExecutionContext, BrowserExecutionOptions, RPCExecutionOptions } from '../types'

import type { ExecutionMode, Executor, BrowserExecutionOptions, RPCExecutionOptions } from '../types'
import { createBrowserExecutor } from './browser'
import { createRPCExecutor } from './rpc'

export type ExecutorOptions =
  | { mode: 'browser'; options?: BrowserExecutionOptions }
  | { mode: 'rpc'; options: RPCExecutionOptions }

/**
 * Create an executor based on the execution mode
 */
export function createExecutor(config: ExecutorOptions): Executor {
  switch (config.mode) {
    case 'browser':
      return createBrowserExecutor(config.options)
    case 'rpc':
      return createRPCExecutor(config.options)
    default:
      throw new Error(`Unknown execution mode: ${(config as { mode: string }).mode}`)
  }
}

/**
 * Create an execution context
 */
export function createExecutionContext(
  initial?: Partial<{
    variables: Record<string, unknown>
    functions: Record<string, Function>
    imports: Record<string, unknown>
  }>
): {
  variables: Record<string, unknown>
  functions: Record<string, Function>
  imports: Record<string, unknown>
} {
  return {
    variables: initial?.variables || {},
    functions: initial?.functions || {},
    imports: initial?.imports || {},
  }
}
