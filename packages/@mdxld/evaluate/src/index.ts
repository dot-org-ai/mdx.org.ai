/**
 * @mdxld/evaluate - Evaluate and execute MDXLD documents
 *
 * Provides functions for executing MDX content:
 * - evaluate: Execute compiled MDX with a JSX runtime
 * - evaluateInSandbox: Execute in isolated ai-sandbox environment
 * - createRuntime: Create a custom MDX runtime
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'
import { compile, type CompileOptions } from '@mdxld/compile'

/**
 * Options for evaluating MDX content
 */
export interface EvaluateOptions {
  /**
   * JSX factory function (e.g., React.createElement or h)
   */
  jsx?: (type: unknown, props: unknown, key?: string) => unknown

  /**
   * JSX factory for static children
   */
  jsxs?: (type: unknown, props: unknown, key?: string) => unknown

  /**
   * Fragment component
   */
  Fragment?: unknown

  /**
   * Additional scope variables available during evaluation
   */
  scope?: Record<string, unknown>

  /**
   * Compile options
   */
  compile?: CompileOptions
}

/**
 * Result of MDX evaluation
 */
export interface EvaluateResult {
  /** The default export (MDX component) */
  default: unknown

  /** Frontmatter data */
  frontmatter: Record<string, unknown>

  /** Any named exports */
  [key: string]: unknown
}

/**
 * Simple JSX factory that creates element objects
 */
export function h(
  type: string | Function,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): { type: string | Function; props: Record<string, unknown> } {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children.length > 0 ? children : undefined,
    },
  }
}

/**
 * Fragment component for JSX
 */
export const Fragment = Symbol.for('Fragment')

/**
 * Evaluate compiled MDX code
 *
 * Note: This uses Function constructor which has security implications.
 * For untrusted content, use evaluateInSandbox instead.
 *
 * @param code - Compiled MDX code (from @mdxld/compile)
 * @param options - Evaluation options
 * @returns Evaluation result with default export and frontmatter
 *
 * @example
 * ```ts
 * import { compile } from '@mdxld/compile'
 * import { evaluate, h, Fragment } from '@mdxld/evaluate'
 *
 * const { code } = await compile('# Hello World')
 * const result = evaluate(code, { jsx: h, Fragment })
 * // result.default is the MDX component
 * ```
 */
export function evaluate(code: string, options: EvaluateOptions = {}): EvaluateResult {
  const { jsx = h, jsxs = jsx, Fragment: Frag = Fragment, scope = {} } = options

  // Build scope object for the function
  const scopeKeys = Object.keys(scope)
  const scopeValues = Object.values(scope)

  // Create function with JSX runtime and scope in context
  const fn = new Function('h', 'Fragment', '_jsx', '_jsxs', '_Fragment', ...scopeKeys, code)

  const result = fn(jsx, Frag, jsx, jsxs, Frag, ...scopeValues)

  return {
    default: result?.default,
    frontmatter: result?.frontmatter || {},
    ...result,
  }
}

/**
 * Compile and evaluate MDX content in one step
 *
 * @param content - Raw MDX content
 * @param options - Compile and evaluate options
 * @returns Evaluation result
 *
 * @example
 * ```ts
 * import { run } from '@mdxld/evaluate'
 *
 * const result = await run('# Hello World')
 * // result.default is the MDX component
 * ```
 */
export async function run(content: string, options: EvaluateOptions = {}): Promise<EvaluateResult> {
  const compiled = await compile(content, {
    outputFormat: 'function-body',
    ...options.compile,
  })

  return evaluate(compiled.code, options)
}

/**
 * Options for sandbox evaluation
 */
export interface SandboxOptions extends EvaluateOptions {
  /**
   * Timeout in milliseconds (default: 5000)
   */
  timeout?: number

  /**
   * Allow network access (default: false)
   */
  allowNetwork?: boolean
}

/**
 * Result from sandbox evaluation
 */
export interface SandboxResult {
  success: boolean
  value?: unknown
  error?: string
  logs: Array<{ level: string; message: string }>
  duration: number
}

/**
 * Evaluate MDX content in an isolated sandbox environment
 *
 * Uses ai-sandbox for secure, isolated execution. Ideal for
 * untrusted content or when you need isolation guarantees.
 *
 * @param content - Raw MDX content to evaluate
 * @param options - Sandbox options
 * @returns Sandbox execution result
 *
 * @example
 * ```ts
 * import { evaluateInSandbox } from '@mdxld/evaluate'
 *
 * const result = await evaluateInSandbox(`
 *   # Hello World
 *
 *   <Counter initial={5} />
 * `)
 *
 * if (result.success) {
 *   console.log('Result:', result.value)
 * } else {
 *   console.error('Error:', result.error)
 * }
 * ```
 */
export async function evaluateInSandbox(content: string, options: SandboxOptions = {}): Promise<SandboxResult> {
  try {
    // Dynamic import ai-sandbox
    const { evaluate: sandboxEvaluate } = await import('ai-sandbox')

    // Compile MDX first
    const compiled = await compile(content, {
      outputFormat: 'function-body',
      ...options.compile,
    })

    // Run in sandbox
    const result = await sandboxEvaluate({
      script: compiled.code,
      sdk: true,
    })

    return result as SandboxResult
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs: [],
      duration: 0,
    }
  }
}

/**
 * Create an MDX runtime with custom components
 *
 * @param components - Component map
 * @param options - Runtime options
 * @returns Runtime with evaluate function
 *
 * @example
 * ```ts
 * import { createRuntime } from '@mdxld/evaluate'
 *
 * const runtime = createRuntime({
 *   Counter: ({ initial }) => ({ count: initial }),
 *   Button: ({ children }) => ({ type: 'button', children }),
 * })
 *
 * const result = await runtime.run('# Hello <Counter initial={5} />')
 * ```
 */
export function createRuntime(
  components: Record<string, unknown> = {},
  options: EvaluateOptions = {}
): {
  evaluate: (code: string) => EvaluateResult
  run: (content: string) => Promise<EvaluateResult>
  components: Record<string, unknown>
} {
  const mergedScope = { ...components, ...options.scope }

  return {
    evaluate: (code: string) => evaluate(code, { ...options, scope: mergedScope }),
    run: (content: string) => run(content, { ...options, scope: mergedScope }),
    components,
  }
}

/**
 * Render MDX component to string (server-side rendering)
 *
 * @param component - MDX component or element
 * @returns HTML string
 *
 * @example
 * ```ts
 * import { run, renderToString } from '@mdxld/evaluate'
 *
 * const { default: MDXContent } = await run('# Hello World')
 * const html = renderToString(MDXContent({}))
 * // '<h1>Hello World</h1>'
 * ```
 */
export function renderToString(element: unknown): string {
  if (element === null || element === undefined) return ''
  if (typeof element === 'string' || typeof element === 'number') return String(element)
  if (Array.isArray(element)) return element.map(renderToString).join('')

  if (typeof element !== 'object') return String(element)

  const el = element as { type?: string | Function | symbol; props?: Record<string, unknown> }

  if (!el.type) return ''

  // Handle Fragment
  if (el.type === Fragment || el.type === Symbol.for('Fragment')) {
    const children = el.props?.children
    return Array.isArray(children) ? children.map(renderToString).join('') : renderToString(children)
  }

  // Handle function components
  if (typeof el.type === 'function') {
    try {
      const result = (el.type as Function)(el.props || {})
      return renderToString(result)
    } catch {
      return ''
    }
  }

  // Handle HTML elements
  const tag = String(el.type)
  const props = el.props || {}
  const { children, ...attrs } = props

  // Build attribute string
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => {
      if (v === true) return k
      const attrName = k === 'className' ? 'class' : k
      return `${attrName}="${String(v).replace(/"/g, '&quot;')}"`
    })
    .join(' ')

  // Void elements
  const voidElements = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'])
  if (voidElements.has(tag.toLowerCase())) {
    return `<${tag}${attrStr ? ` ${attrStr}` : ''} />`
  }

  // Regular elements
  const childContent = renderToString(children)
  return `<${tag}${attrStr ? ` ${attrStr}` : ''}>${childContent}</${tag}>`
}

// Re-export compile for convenience
export { compile, type CompileOptions } from '@mdxld/compile'
