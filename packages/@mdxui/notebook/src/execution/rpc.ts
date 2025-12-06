import type {
  Executor,
  ExecutionContext,
  CellOutput,
  Language,
  RPCExecutionOptions,
} from '../types'

/**
 * Remote executor using rpc.do for server-side TypeScript/MDX execution
 * Use this for executing code that needs server-side resources or APIs
 */
export class RPCExecutor implements Executor {
  private options: Required<RPCExecutionOptions>
  private abortController: AbortController | null = null
  private sessionId: string | null = null

  constructor(options: RPCExecutionOptions) {
    this.options = {
      endpoint: options.endpoint || 'https://rpc.do/execute',
      apiKey: options.apiKey || '',
      timeout: options.timeout || 60000,
      language: options.language || 'javascript',
    }
  }

  async execute(
    code: string,
    language: Language,
    context: ExecutionContext
  ): Promise<CellOutput[]> {
    const startTime = performance.now()
    this.abortController = new AbortController()

    try {
      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey && {
            Authorization: `Bearer ${this.options.apiKey}`,
          }),
        },
        body: JSON.stringify({
          code,
          language,
          sessionId: this.sessionId,
          context: {
            variables: this.serializeContext(context.variables),
          },
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return [
          {
            type: 'error',
            data: {
              name: 'RPCError',
              message: `RPC execution failed: ${response.status} ${response.statusText}`,
              stack: errorText,
            },
            timestamp: Date.now(),
            executionTime: performance.now() - startTime,
          },
        ]
      }

      const result = await response.json()

      // Store session ID for stateful execution
      if (result.sessionId) {
        this.sessionId = result.sessionId
      }

      // Update context with returned variables
      if (result.context?.variables) {
        Object.assign(context.variables, result.context.variables)
      }

      const executionTime = performance.now() - startTime

      return this.parseOutputs(result, executionTime)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [
          {
            type: 'error',
            data: {
              name: 'InterruptedError',
              message: 'Execution was interrupted',
            },
            timestamp: Date.now(),
            executionTime: performance.now() - startTime,
          },
        ]
      }

      return [
        {
          type: 'error',
          data: {
            name: error instanceof Error ? error.name : 'Error',
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
          executionTime: performance.now() - startTime,
        },
      ]
    } finally {
      this.abortController = null
    }
  }

  private serializeContext(
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const serialized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(variables)) {
      try {
        // Only serialize JSON-compatible values
        JSON.stringify(value)
        serialized[key] = value
      } catch {
        // Skip non-serializable values
      }
    }

    return serialized
  }

  private parseOutputs(
    result: RPCResponse,
    executionTime: number
  ): CellOutput[] {
    const outputs: CellOutput[] = []

    // Handle streaming outputs
    if (result.stdout) {
      outputs.push({
        type: 'stream',
        data: result.stdout,
        timestamp: Date.now(),
        executionTime,
      })
    }

    // Handle stderr
    if (result.stderr) {
      outputs.push({
        type: 'error',
        data: {
          name: 'stderr',
          message: result.stderr,
        },
        timestamp: Date.now(),
        executionTime,
      })
    }

    // Handle error
    if (result.error) {
      outputs.push({
        type: 'error',
        data: {
          name: result.error.name || 'Error',
          message: result.error.message,
          stack: result.error.stack,
        },
        timestamp: Date.now(),
        executionTime,
      })
    }

    // Handle result value
    if (result.result !== undefined) {
      outputs.push({
        type: this.detectOutputType(result.result),
        data: result.result,
        timestamp: Date.now(),
        executionTime,
      })
    }

    // Handle display data (like images, HTML, etc.)
    if (result.displayData) {
      for (const display of result.displayData) {
        outputs.push({
          type: display.type as CellOutput['type'],
          data: display.data,
          timestamp: Date.now(),
          executionTime,
        })
      }
    }

    return outputs
  }

  private detectOutputType(value: unknown): CellOutput['type'] {
    if (value === null || value === undefined) {
      return 'text'
    }

    if (typeof value === 'string') {
      if (value.trim().startsWith('<') && value.trim().endsWith('>')) {
        return 'html'
      }
      return 'text'
    }

    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        return 'table'
      }
      return 'json'
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if ('datasets' in obj && 'type' in obj) {
        return 'chart'
      }
      return 'json'
    }

    return 'text'
  }

  async interrupt(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort()
    }

    // Also send interrupt signal to RPC server
    if (this.sessionId) {
      try {
        await fetch(`${this.options.endpoint}/interrupt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.options.apiKey && {
              Authorization: `Bearer ${this.options.apiKey}`,
            }),
          },
          body: JSON.stringify({ sessionId: this.sessionId }),
        })
      } catch {
        // Ignore interrupt request failures
      }
    }
  }

  async reset(): Promise<void> {
    this.sessionId = null

    // Reset server-side session
    try {
      await fetch(`${this.options.endpoint}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey && {
            Authorization: `Bearer ${this.options.apiKey}`,
          }),
        },
        body: JSON.stringify({ sessionId: this.sessionId }),
      })
    } catch {
      // Ignore reset request failures
    }
  }
}

interface RPCResponse {
  result?: unknown
  stdout?: string
  stderr?: string
  error?: {
    name?: string
    message: string
    stack?: string
  }
  sessionId?: string
  context?: {
    variables?: Record<string, unknown>
  }
  displayData?: Array<{
    type: string
    data: unknown
  }>
}

/**
 * Create an RPC executor instance
 */
export function createRPCExecutor(options: RPCExecutionOptions): RPCExecutor {
  return new RPCExecutor(options)
}

/**
 * Execute code via rpc.do
 * Convenience function for one-off executions
 */
export async function executeViaRPC(
  code: string,
  options: RPCExecutionOptions & { language: Language }
): Promise<CellOutput[]> {
  const executor = new RPCExecutor(options)
  return executor.execute(code, options.language, {
    variables: {},
    functions: {},
    imports: {},
  })
}
