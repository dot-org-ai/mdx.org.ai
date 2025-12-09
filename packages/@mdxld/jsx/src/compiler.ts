/**
 * MDX Compiler - Compiles MDX files to JavaScript
 *
 * Supports multiple JSX runtimes: React, Preact, Hono/JSX
 * Includes MDXLD remark plugin for GFM, TypeScript, and mermaid support
 */

import { compile as mdxCompile } from '@mdx-js/mdx'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import { remarkMDXLD, presets as remarkPresets, parseTypeScriptESM, hasTypeScriptImportExport } from '@mdxld/remark'
import type {
  CompileMDXOptions,
  CompileMDXResult,
  MDXLDFrontmatter,
  JSXRuntime,
  JSXPreset,
} from './types.js'
import { JSX_PRESETS } from './types.js'

/**
 * Resolve JSX runtime configuration from preset or custom config
 */
function resolveJSXRuntime(jsx?: JSXRuntime | JSXPreset): JSXRuntime {
  if (!jsx) {
    return JSX_PRESETS.react
  }
  if (typeof jsx === 'string') {
    return JSX_PRESETS[jsx] ?? JSX_PRESETS.react
  }
  return jsx
}

/**
 * Preprocess MDX content to strip TypeScript-specific syntax from import/export statements
 * This is necessary because MDX uses acorn which doesn't support TypeScript syntax
 *
 * @param content - Raw MDX content
 * @returns Content with TypeScript type imports/exports stripped for acorn compatibility
 */
function preprocessTypeScriptImportsExports(content: string): { content: string; hadTypeScript: boolean } {
  // Quick check to avoid processing if no TypeScript syntax
  if (!hasTypeScriptImportExport(content)) {
    return { content, hadTypeScript: false }
  }

  // Use the TypeScript parser to strip all TypeScript-specific syntax
  // This handles:
  // - import type { ... }
  // - import { type Foo, ... }
  // - export type { ... }
  // - export type X = ...
  // - export interface X { ... }
  const result = parseTypeScriptESM(content)

  return {
    content: result.strippedContent,
    hadTypeScript: result.hasTypeScript,
  }
}

/**
 * Compile MDX content to JavaScript
 *
 * @example React (default)
 * ```ts
 * const result = await compileMDX(content)
 * ```
 *
 * @example Preact
 * ```ts
 * const result = await compileMDX(content, { jsx: 'preact' })
 * ```
 *
 * @example Hono/JSX
 * ```ts
 * const result = await compileMDX(content, { jsx: 'hono' })
 * ```
 *
 * @example Custom runtime
 * ```ts
 * const result = await compileMDX(content, {
 *   jsx: { importSource: 'my-jsx-lib' }
 * })
 * ```
 */
export async function compileMDX(
  content: string,
  options: CompileMDXOptions = {}
): Promise<CompileMDXResult> {
  const {
    jsx,
    outputFormat = 'esm',
    exportFrontmatter = true,
    filepath,
    remarkPlugins = [],
    rehypePlugins = [],
    generateTypes = false,
  } = options

  const jsxRuntime = resolveJSXRuntime(jsx as JSXRuntime | JSXPreset)
  const warnings: string[] = []

  // Extract frontmatter
  const { data: frontmatter, content: rawMdxContent } = matter(content) as {
    data: MDXLDFrontmatter
    content: string
  }

  // Preprocess TypeScript import/export statements for acorn compatibility
  // This strips `import type`, `export type`, and `type` specifiers that acorn can't parse
  const { content: mdxContent, hadTypeScript } = preprocessTypeScriptImportsExports(rawMdxContent)

  if (hadTypeScript) {
    warnings.push('TypeScript type imports/exports were stripped for acorn compatibility')
  }

  // Build remark plugins with MDXLD defaults
  const allRemarkPlugins = [
    // GFM for tables, strikethrough, autolinks, task lists
    remarkGfm,
    // MDXLD plugin for mermaid, attributes, TypeScript support
    [remarkMDXLD, remarkPresets.full],
    // User-provided plugins
    ...remarkPlugins,
  ]

  // Compile MDX
  const mdxResult = await mdxCompile(mdxContent, {
    outputFormat: outputFormat === 'function-body' ? 'function-body' : 'program',
    jsx: jsxRuntime.classic ? undefined : true,
    jsxRuntime: jsxRuntime.classic ? 'classic' : 'automatic',
    jsxImportSource: jsxRuntime.importSource,
    development: jsxRuntime.development ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remarkPlugins: allRemarkPlugins as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rehypePlugins: rehypePlugins as any[],
  })

  let code = String(mdxResult)

  // Add frontmatter export if requested
  if (exportFrontmatter && outputFormat !== 'function-body') {
    const frontmatterExport = `\nexport const frontmatter = ${JSON.stringify(frontmatter, null, 2)};\n`
    code += frontmatterExport

    // Add typed metadata export for MDXLD documents
    if (frontmatter.$type || frontmatter.$id) {
      const metadata = {
        $type: frontmatter.$type,
        $id: frontmatter.$id,
        $context: frontmatter.$context,
        name: frontmatter.name,
        description: frontmatter.description,
      }
      code += `export const metadata = ${JSON.stringify(metadata, null, 2)};\n`
    }
  }

  // Generate TypeScript declarations
  let types: string | undefined
  if (generateTypes) {
    types = generateTypeDeclarations(frontmatter, filepath)
  }

  return {
    code,
    frontmatter,
    types,
    warnings,
  }
}

/**
 * Generate TypeScript declarations from MDX frontmatter
 */
function generateTypeDeclarations(
  frontmatter: MDXLDFrontmatter,
  filepath?: string
): string {
  const componentName = frontmatter.name ?? 'MDXContent'
  const props = frontmatter.props ?? {}

  // Build props interface
  const propsInterface = Object.entries(props)
    .map(([key, value]) => {
      const type = inferTypeFromValue(value)
      return `  ${key}${isRequired(value) ? '' : '?'}: ${type};`
    })
    .join('\n')

  return `// Generated from ${filepath ?? 'MDX file'}

export interface ${componentName}Props {
${propsInterface || '  // No props defined'}
  children?: React.ReactNode;
}

declare const ${componentName}: React.FC<${componentName}Props>;
export default ${componentName};

export const frontmatter: {
  $type?: string;
  $id?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

${
  frontmatter.$type || frontmatter.$id
    ? `export const metadata: {
  $type?: string;
  $id?: string;
  $context?: string | Record<string, unknown>;
  name?: string;
  description?: string;
};`
    : ''
}
`
}

/**
 * Infer TypeScript type from frontmatter value definition
 */
function inferTypeFromValue(value: unknown): string {
  if (typeof value === 'string') {
    // Check for type hints in description
    if (value.includes('string')) return 'string'
    if (value.includes('number') || value.includes('integer')) return 'number'
    if (value.includes('boolean')) return 'boolean'
    if (value.includes('URL')) return 'string'
    if (value.includes('date')) return 'string | Date'
    if (value.includes('array') || value.includes('[]')) return 'unknown[]'
    return 'unknown'
  }
  if (Array.isArray(value)) {
    return 'unknown[]'
  }
  if (typeof value === 'object' && value !== null) {
    return 'Record<string, unknown>'
  }
  return 'unknown'
}

/**
 * Check if a prop is required
 */
function isRequired(value: unknown): boolean {
  if (typeof value === 'string') {
    return !value.toLowerCase().includes('optional')
  }
  return true
}

/**
 * Compile multiple MDX files
 */
export async function compileMDXBatch(
  files: Array<{ path: string; content: string }>,
  options: CompileMDXOptions = {}
): Promise<Map<string, CompileMDXResult>> {
  const results = new Map<string, CompileMDXResult>()

  await Promise.all(
    files.map(async ({ path, content }) => {
      const result = await compileMDX(content, {
        ...options,
        filepath: path,
      })
      results.set(path, result)
    })
  )

  return results
}
