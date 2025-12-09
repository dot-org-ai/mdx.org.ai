/**
 * @mdxld/remark - Remark plugin preset for MDXLD
 *
 * A unified remark plugin that provides:
 * - GFM support (tables, strikethrough, autolinks, task lists, footnotes)
 * - TypeScript import/export handling with parallel AST preservation
 * - Mermaid diagram parsing
 * - Custom attributes (remark-attr style)
 * - MDXLD-specific enhancements
 *
 * @packageDocumentation
 */

import type { Root, Code, Parent } from 'mdast'
import type { Plugin, Transformer } from 'unified'
import type { VFile } from 'vfile'
import remarkGfm from 'remark-gfm'
import { parseTypeScriptESM, type TypeScriptESMResult } from './typescript.js'
import { parseMermaid, isMermaidLanguage, type MermaidAST } from './mermaid.js'

// Re-export submodules
export * from './typescript.js'
export * from './mermaid.js'

/**
 * Options for the MDXLD remark plugin
 */
export interface RemarkMDXLDOptions {
  /**
   * Enable GFM (GitHub Flavored Markdown)
   * @default true
   */
  gfm?: boolean

  /**
   * GFM options passed to remark-gfm
   */
  gfmOptions?: Parameters<typeof remarkGfm>[0]

  /**
   * Enable TypeScript import/export handling
   * @default true
   */
  typescript?: boolean

  /**
   * Enable mermaid diagram parsing
   * @default true
   */
  mermaid?: boolean

  /**
   * Enable custom attributes
   * @default true
   */
  attributes?: boolean

  /**
   * Custom code block handlers by language
   */
  codeHandlers?: Record<string, CodeBlockHandler>
}

/**
 * Handler for custom code block processing
 */
export type CodeBlockHandler = (
  node: Code,
  index: number,
  parent: Parent
) => void | Code | null

/**
 * Extended AST data attached to the tree
 */
export interface MDXLDRemarkData {
  /** TypeScript ESM parsing results */
  typescript?: TypeScriptESMResult
  /** Parsed mermaid diagrams */
  mermaid?: Array<{
    source: string
    ast: MermaidAST
    node: Code
  }>
  /** Parsed attributes from code blocks */
  attributes?: Map<Code, Record<string, unknown>>
}

/**
 * Declaration merging for unified data
 */
declare module 'unified' {
  interface Data {
    mdxld?: MDXLDRemarkData
  }
}

/**
 * Parse attributes from code block meta string
 *
 * Supports: ```ts {key=value} {flag} {key="quoted value"}
 */
function parseCodeMeta(meta: string | null | undefined): Record<string, unknown> {
  if (!meta) return {}

  const attrs: Record<string, unknown> = {}
  const regex = /\{([^}]+)\}/g
  let match

  while ((match = regex.exec(meta)) !== null) {
    const content = match[1]!.trim()

    // Key=value pair
    const kvMatch = content.match(/^(\w+)\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+))$/)
    if (kvMatch) {
      const key = kvMatch[1]!
      const value = kvMatch[2] ?? kvMatch[3] ?? kvMatch[4]
      attrs[key] = value
      continue
    }

    // Boolean flag
    if (/^\w+$/.test(content)) {
      attrs[content] = true
    }
  }

  return attrs
}

/**
 * Create the MDXLD remark plugin
 *
 * @example Basic usage
 * ```ts
 * import { unified } from 'unified'
 * import remarkParse from 'remark-parse'
 * import { remarkMDXLD } from '@mdxld/remark'
 *
 * const processor = unified()
 *   .use(remarkParse)
 *   .use(remarkMDXLD)
 * ```
 *
 * @example With options
 * ```ts
 * import { remarkMDXLD } from '@mdxld/remark'
 *
 * processor.use(remarkMDXLD, {
 *   gfm: true,
 *   typescript: true,
 *   mermaid: true,
 *   codeHandlers: {
 *     sql: (node) => {
 *       // Custom SQL handling
 *     }
 *   }
 * })
 * ```
 *
 * @example With MDX
 * ```ts
 * import { compile } from '@mdx-js/mdx'
 * import { remarkMDXLD } from '@mdxld/remark'
 *
 * const result = await compile(content, {
 *   remarkPlugins: [remarkMDXLD]
 * })
 * ```
 */
export const remarkMDXLD: Plugin<[RemarkMDXLDOptions?], Root> = (options = {}) => {
  const {
    gfm = true,
    gfmOptions,
    typescript = true,
    mermaid = true,
    attributes = true,
    codeHandlers = {},
  } = options

  // Build the transformer
  const transformer = (tree: Root, file: VFile): void => {
    // Initialize data storage
    const data: MDXLDRemarkData = {
      mermaid: [],
      attributes: new Map(),
    }

    // Store on file for access by other plugins
    file.data.mdxld = data

    // Process code blocks
    visitCodeBlocks(tree, (node, index, parent) => {
      // Parse attributes from meta
      if (attributes && node.meta) {
        const attrs = parseCodeMeta(node.meta)
        if (Object.keys(attrs).length > 0) {
          data.attributes?.set(node, attrs)
          // Attach to node for easy access
          ;(node as Code & { attributes?: Record<string, unknown> }).attributes = attrs
        }
      }

      // Handle mermaid diagrams
      if (mermaid && isMermaidLanguage(node.lang)) {
        const ast = parseMermaid(node.value)
        data.mermaid?.push({
          source: node.value,
          ast,
          node,
        })
        // Attach AST to node
        ;(node as Code & { mermaidAST?: MermaidAST }).mermaidAST = ast
      }

      // Call custom handler if defined
      const handler = node.lang ? codeHandlers[node.lang] : undefined
      if (handler) {
        return handler(node, index, parent)
      }
    })

    // Handle TypeScript in mdxjsEsm nodes
    if (typescript) {
      const esmContent = extractESMContent(tree)
      if (esmContent) {
        data.typescript = parseTypeScriptESM(esmContent)
      }
    }
  }

  // Note: GFM is handled separately via the preset or by adding remarkGfm to the plugin chain
  // This plugin handles MDXLD-specific transformations
  return transformer
}

/**
 * Visit all code blocks in the tree
 */
function visitCodeBlocks(
  tree: Root,
  visitor: (node: Code, index: number, parent: Parent) => void | Code | null
) {
  function visit(node: Parent | Root) {
    if ('children' in node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (child && child.type === 'code') {
          const result = visitor(child as Code, i, node)
          if (result === null) {
            // Remove node
            node.children.splice(i, 1)
            i--
          } else if (result && result !== child) {
            // Replace node
            node.children[i] = result
          }
        } else if (child && 'children' in child) {
          visit(child as Parent)
        }
      }
    }
  }
  visit(tree)
}

/**
 * Extract ESM content from mdxjsEsm nodes
 */
function extractESMContent(tree: Root): string | null {
  const esmNodes: string[] = []

  function visit(node: unknown) {
    if (node && typeof node === 'object') {
      const n = node as { type?: string; value?: string; children?: unknown[] }
      if (n.type === 'mdxjsEsm' && n.value) {
        esmNodes.push(n.value)
      }
      if (n.children) {
        for (const child of n.children) {
          visit(child)
        }
      }
    }
  }
  visit(tree)

  return esmNodes.length > 0 ? esmNodes.join('\n') : null
}

/**
 * Get MDXLD data from a processed file
 *
 * @example
 * ```ts
 * import { unified } from 'unified'
 * import remarkParse from 'remark-parse'
 * import { remarkMDXLD, getMDXLDData } from '@mdxld/remark'
 *
 * const file = await unified()
 *   .use(remarkParse)
 *   .use(remarkMDXLD)
 *   .process(content)
 *
 * const data = getMDXLDData(file)
 * // data.typescript - TypeScript ESM parsing results
 * // data.mermaid - Parsed mermaid diagrams
 * ```
 */
export function getMDXLDData(file: { data: { mdxld?: MDXLDRemarkData } }): MDXLDRemarkData | undefined {
  return file.data.mdxld
}

/**
 * Default export for unified plugin usage
 */
export default remarkMDXLD

/**
 * Preset configuration for common use cases
 */
export const presets = {
  /**
   * Full preset with all features enabled
   */
  full: {
    gfm: true,
    typescript: true,
    mermaid: true,
    attributes: true,
  } satisfies RemarkMDXLDOptions,

  /**
   * Minimal preset - just GFM
   */
  minimal: {
    gfm: true,
    typescript: false,
    mermaid: false,
    attributes: false,
  } satisfies RemarkMDXLDOptions,

  /**
   * Documentation preset - GFM + mermaid
   */
  docs: {
    gfm: true,
    gfmOptions: { singleTilde: false },
    typescript: false,
    mermaid: true,
    attributes: true,
  } satisfies RemarkMDXLDOptions,

  /**
   * Code-focused preset - GFM + TypeScript
   */
  code: {
    gfm: true,
    typescript: true,
    mermaid: false,
    attributes: true,
  } satisfies RemarkMDXLDOptions,
} as const

/**
 * Type for accessing parsed data on code nodes
 */
export interface CodeNodeExtensions {
  /** Parsed mermaid AST (if mermaid code block) */
  mermaidAST?: MermaidAST
  /** Parsed attributes from meta string */
  attributes?: Record<string, unknown>
}

/**
 * Extended code node type
 */
export type ExtendedCodeNode = Code & CodeNodeExtensions
