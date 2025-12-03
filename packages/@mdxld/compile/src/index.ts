/**
 * @mdxld/compile - Compile MDX/JSX to executable JavaScript
 *
 * Uses esbuild for fast JSX transformation. Supports both:
 * - Compiling MDX documents (markdown + JSX) to components
 * - Transforming raw JSX/TypeScript to plain JavaScript
 *
 * @packageDocumentation
 */

import { transform, type TransformOptions } from 'esbuild'

/**
 * Options for JSX transformation
 */
export interface TransformJSXOptions {
  /**
   * JSX factory function name
   * @default 'h'
   */
  jsxFactory?: string

  /**
   * JSX fragment factory name
   * @default 'Fragment'
   */
  jsxFragment?: string

  /**
   * Whether the input is TypeScript
   * @default true (auto-detected from content)
   */
  typescript?: boolean

  /**
   * Source file name for error messages
   * @default 'input.tsx'
   */
  sourcefile?: string

  /**
   * Whether to minify output
   * @default false
   */
  minify?: boolean

  /**
   * Target environment
   * @default 'esnext'
   */
  target?: string
}

/**
 * Result of JSX transformation
 */
export interface TransformResult {
  /** Transformed JavaScript code */
  code: string

  /** Source map (if requested) */
  map?: string

  /** Any warnings from transformation */
  warnings: string[]
}

/**
 * Transform JSX/TSX code to plain JavaScript
 *
 * Uses esbuild for fast, reliable transformation.
 *
 * @example
 * ```ts
 * const result = await transformJSX(`
 *   const App = () => <div>Hello</div>
 * `)
 * // result.code: "const App = () => h('div', null, 'Hello')"
 * ```
 *
 * @example With custom factory
 * ```ts
 * const result = await transformJSX(code, {
 *   jsxFactory: 'React.createElement',
 *   jsxFragment: 'React.Fragment'
 * })
 * ```
 */
export async function transformJSX(
  code: string,
  options: TransformJSXOptions = {}
): Promise<TransformResult> {
  const {
    jsxFactory = 'h',
    jsxFragment = 'Fragment',
    typescript = true,
    sourcefile = 'input.tsx',
    minify = false,
    target = 'esnext',
  } = options

  const transformOptions: TransformOptions = {
    loader: typescript ? 'tsx' : 'jsx',
    jsxFactory,
    jsxFragment,
    sourcefile,
    minify,
    target,
    format: 'esm',
  }

  try {
    const result = await transform(code, transformOptions)

    return {
      code: result.code,
      map: result.map,
      warnings: result.warnings.map((w) => w.text),
    }
  } catch (error) {
    // Re-throw with better error message
    if (error instanceof Error) {
      throw new Error(`JSX transformation failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Synchronous JSX transformation (uses esbuild's transform sync)
 *
 * Note: Prefer the async version when possible for better performance.
 */
export function transformJSXSync(
  code: string,
  options: TransformJSXOptions = {}
): TransformResult {
  const {
    jsxFactory = 'h',
    jsxFragment = 'Fragment',
    typescript = true,
    sourcefile = 'input.tsx',
    minify = false,
    target = 'esnext',
  } = options

  // Use dynamic require for sync version
  const esbuild = require('esbuild') as typeof import('esbuild')

  const result = esbuild.transformSync(code, {
    loader: typescript ? 'tsx' : 'jsx',
    jsxFactory,
    jsxFragment,
    sourcefile,
    minify,
    target,
    format: 'esm',
  })

  return {
    code: result.code,
    map: result.map,
    warnings: result.warnings.map((w) => w.text),
  }
}

/**
 * Options for compiling MDX content
 */
export interface CompileOptions extends TransformJSXOptions {
  /**
   * Output format
   * - 'function-body': Code that can be wrapped in a function
   * - 'module': ES module with exports
   * @default 'function-body'
   */
  outputFormat?: 'function-body' | 'module'

  /**
   * Include frontmatter data in output
   * @default true
   */
  includeFrontmatter?: boolean
}

/**
 * Compiled MDX result
 */
export interface CompileResult extends TransformResult {
  /** Extracted frontmatter data */
  frontmatter?: Record<string, unknown>
}

/**
 * Compile MDX content to JavaScript
 *
 * Handles both markdown content and inline JSX, transforming
 * everything to executable JavaScript.
 *
 * @example
 * ```ts
 * const result = await compile(`
 * ---
 * title: Hello
 * ---
 *
 * # Welcome
 *
 * <Counter initial={5} />
 * `)
 * ```
 */
export async function compile(
  content: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const { outputFormat = 'function-body', includeFrontmatter = true, ...transformOptions } = options

  // Extract frontmatter if present
  let frontmatter: Record<string, unknown> | undefined
  let body = content

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1]!
    body = frontmatterMatch[2]!

    // Simple YAML parsing for common cases
    frontmatter = {}
    for (const line of yamlContent.split('\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        let value: unknown = line.slice(colonIndex + 1).trim()

        // Handle common YAML values
        if (value === 'true') value = true
        else if (value === 'false') value = false
        else if (value === 'null') value = null
        else if (/^-?\d+$/.test(value as string)) value = parseInt(value as string, 10)
        else if (/^-?\d+\.\d+$/.test(value as string)) value = parseFloat(value as string)
        else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
          value = (value as string).slice(1, -1)
        } else if ((value as string).startsWith("'") && (value as string).endsWith("'")) {
          value = (value as string).slice(1, -1)
        }

        frontmatter[key] = value
      }
    }
  }

  // Transform the body content
  // Wrap in a component if it contains JSX
  const hasJSX = /<[A-Za-z]/.test(body)

  let codeToTransform: string
  if (hasJSX) {
    // Wrap content in a component function
    codeToTransform = `
const MDXContent = (props) => {
  return (
    <>
      ${body}
    </>
  )
}

${
  outputFormat === 'module'
    ? `export default MDXContent;
export const frontmatter = ${JSON.stringify(frontmatter ?? {})};`
    : `return { default: MDXContent, frontmatter: ${JSON.stringify(frontmatter ?? {})} };`
}
`
  } else {
    // Plain text content - wrap in component
    const escapedBody = body.replace(/`/g, '\\`').replace(/\$/g, '\\$')
    codeToTransform = `
const MDXContent = (props) => {
  return h('div', null, \`${escapedBody}\`)
}

${
  outputFormat === 'module'
    ? `export default MDXContent;
export const frontmatter = ${JSON.stringify(frontmatter ?? {})};`
    : `return { default: MDXContent, frontmatter: ${JSON.stringify(frontmatter ?? {})} };`
}
`
  }

  const result = await transformJSX(codeToTransform, transformOptions)

  return {
    ...result,
    frontmatter: includeFrontmatter ? frontmatter : undefined,
  }
}

/**
 * Check if code contains JSX that needs transformation
 */
export function containsJSX(code: string): boolean {
  // Look for JSX patterns:
  // - Opening tags: <Component or <div
  // - Self-closing tags: <Component /> or <br />
  // - Fragment syntax: <> or </>
  const jsxPattern = /<[A-Z][a-zA-Z0-9]*[\s/>]|<[a-z][a-z0-9-]*[\s/>]|<>|<\/>/
  const jsxReturnPattern = /return\s*\(\s*<|return\s+<[A-Za-z]/

  return jsxPattern.test(code) || jsxReturnPattern.test(code)
}

/**
 * Transform test code containing JSX for sandbox execution
 *
 * This is specifically designed for @mdxe/vitest to transform
 * test code before passing to ai-sandbox.
 *
 * @example
 * ```ts
 * const testCode = `
 *   const Counter = () => <div>0</div>
 *   app.get('/', (c) => c.html(<Counter />))
 * `
 * const transformed = await transformTestCode(testCode)
 * // Ready for sandbox execution
 * ```
 */
export async function transformTestCode(
  code: string,
  options: TransformJSXOptions = {}
): Promise<string> {
  // Use 'h' as the JSX factory (matches ai-sandbox's built-in JSX support)
  const result = await transformJSX(code, {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    ...options,
  })

  return result.code
}
