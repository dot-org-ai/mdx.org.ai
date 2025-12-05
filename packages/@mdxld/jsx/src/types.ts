/**
 * JSX runtime configuration - supports React, Preact, Hono/JSX, and custom runtimes
 */
export interface JSXRuntime {
  /**
   * JSX import source for automatic runtime
   * @example 'react' | 'preact' | 'hono/jsx'
   */
  importSource?: string

  /**
   * Use classic runtime with manual h/Fragment imports
   * @default false (uses automatic runtime)
   */
  classic?: boolean

  /**
   * JSX factory function name (classic mode only)
   * @default 'jsx'
   */
  jsxFactory?: string

  /**
   * Fragment factory name (classic mode only)
   * @default 'Fragment'
   */
  jsxFragment?: string

  /**
   * Development mode - adds extra debugging info
   * @default false
   */
  development?: boolean
}

/**
 * Options for compiling MDX files
 */
export interface CompileMDXOptions {
  /**
   * JSX runtime configuration
   */
  jsx?: JSXRuntime

  /**
   * Output format
   * - 'esm': ES Module format
   * - 'cjs': CommonJS format
   * - 'function-body': Code for runtime evaluation
   * @default 'esm'
   */
  outputFormat?: 'esm' | 'cjs' | 'function-body'

  /**
   * Include frontmatter export
   * @default true
   */
  exportFrontmatter?: boolean

  /**
   * Source file path for error messages
   */
  filepath?: string

  /**
   * Remark plugins to apply
   */
  remarkPlugins?: unknown[]

  /**
   * Rehype plugins to apply
   */
  rehypePlugins?: unknown[]

  /**
   * Generate TypeScript declarations
   * @default false
   */
  generateTypes?: boolean
}

/**
 * Result of MDX compilation
 */
export interface CompileMDXResult {
  /**
   * Compiled JavaScript code
   */
  code: string

  /**
   * Extracted frontmatter data
   */
  frontmatter: Record<string, unknown>

  /**
   * Generated TypeScript declarations (if generateTypes is true)
   */
  types?: string

  /**
   * Source map
   */
  map?: string

  /**
   * Any warnings from compilation
   */
  warnings: string[]
}

/**
 * MDXLD document structure parsed from frontmatter
 */
export interface MDXLDFrontmatter {
  /**
   * JSON-LD type ($type in frontmatter)
   */
  $type?: string

  /**
   * JSON-LD identifier ($id in frontmatter)
   */
  $id?: string

  /**
   * JSON-LD context ($context in frontmatter)
   */
  $context?: string | Record<string, unknown>

  /**
   * Component name
   */
  name?: string

  /**
   * Component description
   */
  description?: string

  /**
   * Props definition
   */
  props?: Record<string, unknown>

  /**
   * Additional frontmatter fields
   */
  [key: string]: unknown
}

/**
 * Preset configurations for common JSX runtimes
 */
export const JSX_PRESETS = {
  react: {
    importSource: 'react',
    development: false,
  },
  'react-dev': {
    importSource: 'react',
    development: true,
  },
  preact: {
    importSource: 'preact',
    development: false,
  },
  /**
   * Hono JSX for server-side rendering
   */
  hono: {
    importSource: 'hono/jsx',
    development: false,
  },
  /**
   * Hono JSX DOM for client-side rendering (2.8KB vs React's 47.8KB)
   * Use this for interactive client components
   */
  'hono-dom': {
    importSource: 'hono/jsx/dom',
    development: false,
  },
  /**
   * Classic JSX transform (manual h/Fragment)
   */
  classic: {
    classic: true,
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
} as const satisfies Record<string, JSXRuntime>

export type JSXPreset = keyof typeof JSX_PRESETS
