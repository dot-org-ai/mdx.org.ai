/**
 * @mdxe/bun - MDX evaluation using Bun's native capabilities
 *
 * Compile and execute MDX content directly using Bun's fast TypeScript/JSX support.
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'
import { stripTypeScript } from './extract.js'

/**
 * Options for MDX evaluation
 */
export interface EvaluateOptions {
  /** Global variables to expose to the evaluated code */
  globals?: Record<string, unknown>
  /** Whether to strip TypeScript types (default: true for Bun's native TS) */
  stripTypes?: boolean
  /** JSX runtime ('react' | 'preact' | 'hono' | 'none') */
  jsxRuntime?: 'react' | 'preact' | 'hono' | 'none'
}

/**
 * Result of MDX evaluation
 */
export interface EvaluateResult<T = unknown> {
  /** All exports from the MDX module */
  exports: Record<string, unknown>
  /** Default export (if any) */
  default?: T
  /** Frontmatter/data from the MDX document */
  data: Record<string, unknown>
  /** Raw content (markdown body) */
  content: string
  /** The original parsed document */
  doc: MDXLDDocument
}

/**
 * Evaluate MDX content and return its exports
 *
 * Uses Bun's native TypeScript support for fast evaluation.
 *
 * @param mdxContent - MDX content string
 * @param options - Evaluation options
 * @returns Evaluated module exports and metadata
 *
 * @example
 * ```ts
 * const result = await evaluate(`
 * ---
 * title: Hello
 * ---
 *
 * export const greet = (name: string) => \`Hello, \${name}!\`
 * export const add = (a: number, b: number) => a + b
 * `)
 *
 * console.log(result.exports.greet('World')) // "Hello, World!"
 * console.log(result.data.title) // "Hello"
 * ```
 */
export async function evaluate<T = unknown>(
  mdxContent: string,
  options: EvaluateOptions = {}
): Promise<EvaluateResult<T>> {
  const { globals = {}, stripTypes = false } = options

  // Parse the MDX document
  const doc = parse(mdxContent)

  // Extract code blocks that are exports
  const codeToEvaluate = extractExecutableCode(mdxContent)

  // Optionally strip TypeScript types for non-Bun environments
  const code = stripTypes ? stripTypeScript(codeToEvaluate) : codeToEvaluate

  // Create the evaluation context
  const exports: Record<string, unknown> = {}
  const module = { exports }

  // Build the function body with globals
  const globalNames = Object.keys(globals)
  const globalValues = Object.values(globals)

  try {
    // Use AsyncFunction for async support
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    // Wrap exports in a module pattern
    const wrappedCode = `
      const exports = {};
      const module = { exports };
      ${code}
      return { exports, module };
    `

    const fn = new AsyncFunction(...globalNames, wrappedCode)
    const result = await fn(...globalValues)

    return {
      exports: { ...result.exports, ...result.module.exports },
      default: result.exports.default || result.module.exports.default,
      data: doc.data,
      content: doc.content,
      doc,
    }
  } catch (error) {
    throw new Error(
      `Failed to evaluate MDX: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Extract executable code from MDX content
 *
 * Finds code blocks marked as executable and export statements.
 */
function extractExecutableCode(content: string): string {
  const lines: string[] = []

  // Extract export statements from the document
  const exportRegex = /^export\s+(?:const|let|var|function|class|async\s+function)\s+[\s\S]*?(?=\n(?:export|$)|$)/gm
  let match
  while ((match = exportRegex.exec(content)) !== null) {
    lines.push(match[0])
  }

  // Also extract code blocks marked as executable
  const codeBlockRegex = /```(?:ts|typescript|js|javascript)\s+(?:run|exec|export)\s*\n([\s\S]*?)```/g
  while ((match = codeBlockRegex.exec(content)) !== null) {
    lines.push(match[1])
  }

  return lines.join('\n\n')
}

/**
 * Evaluate an MDX file
 *
 * @param filePath - Path to the MDX file
 * @param options - Evaluation options
 * @returns Evaluated module exports and metadata
 */
export async function evaluateFile<T = unknown>(
  filePath: string,
  options: EvaluateOptions = {}
): Promise<EvaluateResult<T>> {
  const content = await Bun.file(filePath).text()
  return evaluate<T>(content, options)
}

/**
 * Run a specific exported function from MDX content
 *
 * @param mdxContent - MDX content string
 * @param functionName - Name of the function to call
 * @param args - Arguments to pass to the function
 * @param options - Evaluation options
 * @returns Function result
 *
 * @example
 * ```ts
 * const result = await run(
 *   'export const add = (a, b) => a + b',
 *   'add',
 *   [1, 2]
 * )
 * console.log(result) // 3
 * ```
 */
export async function run<R = unknown>(
  mdxContent: string,
  functionName: string,
  args: unknown[] = [],
  options: EvaluateOptions = {}
): Promise<R> {
  const { exports } = await evaluate(mdxContent, options)

  const fn = exports[functionName]
  if (typeof fn !== 'function') {
    throw new Error(`Export '${functionName}' is not a function`)
  }

  return fn(...args) as R
}

/**
 * Run a specific exported function from an MDX file
 *
 * @param filePath - Path to the MDX file
 * @param functionName - Name of the function to call
 * @param args - Arguments to pass to the function
 * @param options - Evaluation options
 * @returns Function result
 */
export async function runFile<R = unknown>(
  filePath: string,
  functionName: string,
  args: unknown[] = [],
  options: EvaluateOptions = {}
): Promise<R> {
  const content = await Bun.file(filePath).text()
  return run<R>(content, functionName, args, options)
}

/**
 * Create a simple expect function for test assertions
 */
export function createExpect() {
  return function expect(actual: unknown) {
    return {
      toBe(expected: unknown) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`)
        }
      },
      toEqual(expected: unknown) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`)
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`)
        }
      },
      toContain(expected: unknown) {
        if (typeof actual === 'string' && typeof expected === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`)
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
          }
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`)
        }
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new Error(`Expected value to be undefined`)
        }
      },
      toBeNull() {
        if (actual !== null) {
          throw new Error(`Expected value to be null`)
        }
      },
      toBeGreaterThan(expected: number) {
        if (typeof actual !== 'number' || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      },
      toBeLessThan(expected: number) {
        if (typeof actual !== 'number' || actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`)
        }
      },
      toThrow(message?: string | RegExp) {
        if (typeof actual !== 'function') {
          throw new Error(`Expected a function`)
        }
        try {
          (actual as () => void)()
          throw new Error(`Expected function to throw`)
        } catch (e) {
          if (message) {
            const errorMessage = (e as Error).message
            if (typeof message === 'string' && !errorMessage.includes(message)) {
              throw new Error(`Expected error message to contain "${message}"`)
            }
            if (message instanceof RegExp && !message.test(errorMessage)) {
              throw new Error(`Expected error message to match ${message}`)
            }
          }
        }
      },
      toHaveLength(expected: number) {
        const len = (actual as { length: number })?.length
        if (len !== expected) {
          throw new Error(`Expected length ${expected}, got ${len}`)
        }
      },
      toHaveProperty(key: string, value?: unknown) {
        if (actual === null || actual === undefined) {
          throw new Error(`Expected ${JSON.stringify(actual)} to have property '${key}'`)
        }
        if (!(key in (actual as object))) {
          throw new Error(`Expected object to have property '${key}'`)
        }
        if (value !== undefined && (actual as Record<string, unknown>)[key] !== value) {
          throw new Error(`Expected property '${key}' to be ${JSON.stringify(value)}`)
        }
      },
      not: {
        toBe(expected: unknown) {
          if (actual === expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`)
          }
        },
        toEqual(expected: unknown) {
          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`)
          }
        },
        toContain(expected: unknown) {
          if (typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)) {
            throw new Error(`Expected "${actual}" not to contain "${expected}"`)
          }
          if (Array.isArray(actual) && actual.includes(expected)) {
            throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`)
          }
        },
        toBeDefined() {
          if (actual !== undefined) {
            throw new Error(`Expected value to be undefined`)
          }
        },
        toBeNull() {
          if (actual === null) {
            throw new Error(`Expected value not to be null`)
          }
        },
      },
    }
  }
}
