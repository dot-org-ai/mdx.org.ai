import type {
  Executor,
  ExecutionContext,
  CellOutput,
  Language,
  BrowserExecutionOptions,
} from '../types'

/**
 * Browser-side JavaScript/TypeScript executor using sandboxed eval
 */
export class BrowserExecutor implements Executor {
  private options: BrowserExecutionOptions
  private abortController: AbortController | null = null

  constructor(options: BrowserExecutionOptions = {}) {
    this.options = {
      timeout: 30000,
      sandbox: true,
      ...options,
    }
  }

  async execute(
    code: string,
    language: Language,
    context: ExecutionContext
  ): Promise<CellOutput[]> {
    const startTime = performance.now()
    const outputs: CellOutput[] = []

    // Only JavaScript/TypeScript are supported in browser
    if (language !== 'javascript' && language !== 'typescript') {
      return [
        {
          type: 'error',
          data: {
            name: 'UnsupportedLanguageError',
            message: `Language "${language}" is not supported in browser execution mode. Use RPC mode for ${language}.`,
          },
          timestamp: Date.now(),
        },
      ]
    }

    this.abortController = new AbortController()

    try {
      // Create a sandboxed execution environment
      const result = await this.executeInSandbox(code, context)

      const executionTime = performance.now() - startTime

      if (result !== undefined) {
        outputs.push({
          type: this.detectOutputType(result),
          data: this.formatOutput(result),
          timestamp: Date.now(),
          executionTime,
        })
      }
    } catch (error) {
      outputs.push({
        type: 'error',
        data: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      })
    } finally {
      this.abortController = null
    }

    return outputs
  }

  private async executeInSandbox(
    code: string,
    context: ExecutionContext
  ): Promise<unknown> {
    // Create console capture
    const logs: Array<{ type: string; args: unknown[] }> = []
    const captureConsole = {
      log: (...args: unknown[]) => logs.push({ type: 'log', args }),
      error: (...args: unknown[]) => logs.push({ type: 'error', args }),
      warn: (...args: unknown[]) => logs.push({ type: 'warn', args }),
      info: (...args: unknown[]) => logs.push({ type: 'info', args }),
    }

    // Build the sandbox context
    const sandboxContext = {
      ...context.variables,
      ...context.functions,
      console: captureConsole,
      fetch: globalThis.fetch?.bind(globalThis),
      setTimeout: globalThis.setTimeout?.bind(globalThis),
      clearTimeout: globalThis.clearTimeout?.bind(globalThis),
      Promise: globalThis.Promise,
      Array: globalThis.Array,
      Object: globalThis.Object,
      Map: globalThis.Map,
      Set: globalThis.Set,
      JSON: globalThis.JSON,
      Math: globalThis.Math,
      Date: globalThis.Date,
      RegExp: globalThis.RegExp,
      Error: globalThis.Error,
      Number: globalThis.Number,
      String: globalThis.String,
      Boolean: globalThis.Boolean,
    }

    // Create the function with context
    const contextKeys = Object.keys(sandboxContext)
    const contextValues = Object.values(sandboxContext)

    // Wrap code to capture last expression value
    const wrappedCode = `
      "use strict";
      return (async () => {
        ${code}
      })();
    `

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(...contextKeys, wrappedCode)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.options.timeout)
      })

      const result = await Promise.race([
        fn(...contextValues),
        timeoutPromise,
      ])

      // Update context with any new variables
      // (In a real implementation, we'd need to track variable assignments)

      return result
    } catch (error) {
      throw error
    }
  }

  private detectOutputType(value: unknown): CellOutput['type'] {
    if (value === null || value === undefined) {
      return 'text'
    }

    if (typeof value === 'string') {
      // Check if it's HTML
      if (value.trim().startsWith('<') && value.trim().endsWith('>')) {
        return 'html'
      }
      return 'text'
    }

    if (Array.isArray(value)) {
      // Check if it's tabular data
      if (value.length > 0 && typeof value[0] === 'object') {
        return 'table'
      }
      return 'json'
    }

    if (typeof value === 'object') {
      // Check for chart data structure
      if ('datasets' in (value as Record<string, unknown>)) {
        return 'chart'
      }
      return 'json'
    }

    return 'text'
  }

  private formatOutput(value: unknown): unknown {
    if (value === null || value === undefined) {
      return String(value)
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Format as table
      const rows = value as Record<string, unknown>[]
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
      return { columns, rows }
    }

    return value
  }

  async interrupt(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  async reset(): Promise<void> {
    // Reset any state if needed
  }
}

/**
 * Create a browser executor instance
 */
export function createBrowserExecutor(
  options?: BrowserExecutionOptions
): BrowserExecutor {
  return new BrowserExecutor(options)
}
