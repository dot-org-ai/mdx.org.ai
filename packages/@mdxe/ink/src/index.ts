/**
 * @mdxe/ink - Render MDXLD documents in the terminal with Ink
 *
 * Provides React components for rendering MDX content in CLI applications
 * using the Ink framework.
 *
 * @packageDocumentation
 */

import React from 'react'
import { Text, Box, Newline } from 'ink'
import { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'

/**
 * Theme configuration for terminal rendering
 */
export interface Theme {
  /** Heading colors by level (1-6) */
  heading?: {
    1?: string
    2?: string
    3?: string
    4?: string
    5?: string
    6?: string
  }
  /** Bold/strong text color */
  bold?: string
  /** Italic/emphasis text color */
  italic?: string
  /** Code text color */
  code?: string
  /** Code background (not all terminals support) */
  codeBackground?: string
  /** Link text color */
  link?: string
  /** Blockquote text color */
  blockquote?: string
  /** List bullet color */
  bullet?: string
  /** Horizontal rule color */
  hr?: string
  /** Frontmatter key color */
  frontmatterKey?: string
  /** Frontmatter value color */
  frontmatterValue?: string
}

/**
 * Default theme
 */
export const defaultTheme: Theme = {
  heading: {
    1: 'cyan',
    2: 'blue',
    3: 'magenta',
    4: 'yellow',
    5: 'green',
    6: 'white',
  },
  bold: 'white',
  italic: 'gray',
  code: 'green',
  link: 'blue',
  blockquote: 'gray',
  bullet: 'yellow',
  hr: 'gray',
  frontmatterKey: 'cyan',
  frontmatterValue: 'white',
}

/**
 * Render options
 */
export interface RenderOptions {
  /** Theme for styling */
  theme?: Theme
  /** Show frontmatter */
  showFrontmatter?: boolean
  /** Maximum width (0 for no limit) */
  maxWidth?: number
  /** Indent size for nested content */
  indentSize?: number
}

const defaultOptions: Required<RenderOptions> = {
  theme: defaultTheme,
  showFrontmatter: true,
  maxWidth: 80,
  indentSize: 2,
}

/**
 * Props for MDXDocument component
 */
export interface MDXDocumentProps {
  /** MDXLD document to render */
  doc: MDXLDDocument
  /** Render options */
  options?: RenderOptions
}

/**
 * Props for MDXContent component
 */
export interface MDXContentProps {
  /** Raw MDX content string */
  content: string
  /** Render options */
  options?: RenderOptions
}

/**
 * Render MDXLD document in terminal
 *
 * @example
 * ```tsx
 * import { render } from 'ink'
 * import { MDXDocument } from '@mdxe/ink'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(content)
 * render(<MDXDocument doc={doc} />)
 * ```
 */
export function MDXDocument({ doc, options = {} }: MDXDocumentProps): React.ReactElement {
  const opts = { ...defaultOptions, ...options }
  const theme = { ...defaultTheme, ...opts.theme }
  const ast = toAst(doc)

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    opts.showFrontmatter && Object.keys(doc.data).length > 0
      ? React.createElement(Frontmatter, { data: doc.data, theme })
      : null,
    React.createElement(ASTRenderer, { nodes: ast.children.filter((n) => n.type !== 'yaml'), theme, options: opts })
  )
}

/**
 * Render raw MDX content in terminal
 *
 * @example
 * ```tsx
 * import { render } from 'ink'
 * import { MDXContent } from '@mdxe/ink'
 *
 * render(<MDXContent content="# Hello World" />)
 * ```
 */
export function MDXContent({ content, options = {} }: MDXContentProps): React.ReactElement {
  const doc = parse(content)
  return React.createElement(MDXDocument, { doc, options })
}

/**
 * Frontmatter display component
 */
function Frontmatter({ data, theme }: { data: Record<string, unknown>; theme: Theme }): React.ReactElement {
  const entries = Object.entries(data)

  return React.createElement(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    React.createElement(Text, { color: theme.hr }, '─'.repeat(40)),
    ...entries.map(([key, value], i) =>
      React.createElement(
        Box,
        { key: i },
        React.createElement(Text, { color: theme.frontmatterKey }, key),
        React.createElement(Text, null, ': '),
        React.createElement(Text, { color: theme.frontmatterValue }, formatValue(value))
      )
    ),
    React.createElement(Text, { color: theme.hr }, '─'.repeat(40)),
    React.createElement(Newline, null)
  )
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * AST node renderer
 */
function ASTRenderer({
  nodes,
  theme,
  options,
  indent = 0,
}: {
  nodes: MDXLDAstNode[]
  theme: Theme
  options: Required<RenderOptions>
  indent?: number
}): React.ReactElement {
  return React.createElement(
    Box,
    { flexDirection: 'column' },
    nodes.map((node, i) => React.createElement(NodeRenderer, { key: i, node, theme, options, indent }))
  )
}

/**
 * Single node renderer
 */
function NodeRenderer({
  node,
  theme,
  options,
  indent = 0,
}: {
  node: MDXLDAstNode
  theme: Theme
  options: Required<RenderOptions>
  indent?: number
}): React.ReactElement | null {
  const indentStr = ' '.repeat(indent * options.indentSize)

  switch (node.type) {
    case 'heading':
      return React.createElement(Heading, { node, theme })

    case 'paragraph':
      return React.createElement(
        Box,
        { marginBottom: 1, paddingLeft: indent },
        React.createElement(InlineContent, { nodes: node.children || [], theme })
      )

    case 'text':
      return React.createElement(Text, null, node.value || '')

    case 'strong':
      return React.createElement(Text, { bold: true, color: theme.bold }, renderInlineChildren(node, theme))

    case 'emphasis':
      return React.createElement(Text, { italic: true, color: theme.italic }, renderInlineChildren(node, theme))

    case 'inlineCode':
      return React.createElement(Text, { color: theme.code }, `\`${node.value || ''}\``)

    case 'code':
      return React.createElement(CodeBlock, { node, theme, indent })

    case 'link':
      return React.createElement(
        Text,
        { color: theme.link },
        `[${renderInlineChildren(node, theme)}](${node.url || ''})`
      )

    case 'image':
      return React.createElement(Text, { color: theme.link }, `[Image: ${node.alt || node.url || ''}]`)

    case 'list':
      return React.createElement(List, { node, theme, options, indent })

    case 'blockquote':
      return React.createElement(Blockquote, { node, theme, options })

    case 'thematicBreak':
      return React.createElement(
        Box,
        { marginY: 1 },
        React.createElement(Text, { color: theme.hr }, '─'.repeat(options.maxWidth || 40))
      )

    case 'break':
      return React.createElement(Newline, null)

    case 'html':
      // Strip HTML in terminal
      return null

    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      // Show component name
      return React.createElement(
        Text,
        { color: 'gray' },
        `<${(node.name as string) || 'Component'} />`
      )

    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return React.createElement(Text, { color: 'gray' }, `{${node.value || '...'}}`)

    default:
      // Try to render children if present
      if (node.children && node.children.length > 0) {
        return React.createElement(ASTRenderer, { nodes: node.children, theme, options, indent })
      }
      if (node.value) {
        return React.createElement(Text, null, node.value)
      }
      return null
  }
}

/**
 * Heading component
 */
function Heading({ node, theme }: { node: MDXLDAstNode; theme: Theme }): React.ReactElement {
  const depth = (node.depth as number) || 1
  const color = theme.heading?.[depth as keyof typeof theme.heading] || 'white'
  const prefix = '#'.repeat(depth) + ' '
  const content = renderInlineChildren(node, theme)

  return React.createElement(
    Box,
    { marginTop: depth === 1 ? 0 : 1, marginBottom: 1 },
    React.createElement(Text, { bold: true, color }, prefix + content)
  )
}

/**
 * Code block component
 */
function CodeBlock({
  node,
  theme,
  indent = 0,
}: {
  node: MDXLDAstNode
  theme: Theme
  indent?: number
}): React.ReactElement {
  const lang = (node.lang as string) || ''
  const value = node.value || ''
  const lines = value.split('\n')

  return React.createElement(
    Box,
    { flexDirection: 'column', marginY: 1, paddingLeft: indent },
    lang ? React.createElement(Text, { color: 'gray' }, `\`\`\`${lang}`) : null,
    ...lines.map((line, i) => React.createElement(Text, { key: i, color: theme.code }, '  ' + line)),
    React.createElement(Text, { color: 'gray' }, '```')
  )
}

/**
 * List component
 */
function List({
  node,
  theme,
  options,
  indent = 0,
}: {
  node: MDXLDAstNode
  theme: Theme
  options: Required<RenderOptions>
  indent?: number
}): React.ReactElement {
  const ordered = node.ordered as boolean
  const start = (node.start as number) || 1

  return React.createElement(
    Box,
    { flexDirection: 'column', marginY: 1, paddingLeft: indent },
    (node.children || []).map((item, i) => {
      const bullet = ordered ? `${start + i}. ` : '• '
      const checked = item.checked as boolean | null

      let prefix = bullet
      if (checked !== null && checked !== undefined) {
        prefix = checked ? '☑ ' : '☐ '
      }

      return React.createElement(
        Box,
        { key: i },
        React.createElement(Text, { color: theme.bullet }, prefix),
        React.createElement(
          Box,
          { flexDirection: 'column' },
          (item.children || []).map((child, j) => {
            if (child.type === 'paragraph') {
              return React.createElement(InlineContent, { key: j, nodes: child.children || [], theme })
            }
            if (child.type === 'list') {
              return React.createElement(List, { key: j, node: child, theme, options, indent: indent + 1 })
            }
            return React.createElement(NodeRenderer, { key: j, node: child, theme, options, indent: indent + 1 })
          })
        )
      )
    })
  )
}

/**
 * Blockquote component
 */
function Blockquote({
  node,
  theme,
  options,
}: {
  node: MDXLDAstNode
  theme: Theme
  options: Required<RenderOptions>
}): React.ReactElement {
  return React.createElement(
    Box,
    { flexDirection: 'column', marginY: 1, paddingLeft: 2, borderLeft: true, borderColor: theme.blockquote },
    (node.children || []).map((child, i) =>
      React.createElement(
        Text,
        { key: i, color: theme.blockquote },
        child.type === 'paragraph' ? renderInlineChildren(child, theme) : ''
      )
    )
  )
}

/**
 * Inline content renderer
 */
function InlineContent({ nodes, theme }: { nodes: MDXLDAstNode[]; theme: Theme }): React.ReactElement {
  return React.createElement(Text, null, renderInlineChildren({ children: nodes } as MDXLDAstNode, theme))
}

/**
 * Render inline children to string
 */
function renderInlineChildren(node: MDXLDAstNode, theme: Theme): string {
  if (!node.children) return node.value || ''

  return node.children
    .map((child) => {
      switch (child.type) {
        case 'text':
          return child.value || ''
        case 'strong':
          return `**${renderInlineChildren(child, theme)}**`
        case 'emphasis':
          return `*${renderInlineChildren(child, theme)}*`
        case 'inlineCode':
          return `\`${child.value || ''}\``
        case 'link':
          return `[${renderInlineChildren(child, theme)}](${child.url || ''})`
        case 'delete':
          return `~~${renderInlineChildren(child, theme)}~~`
        default:
          return renderInlineChildren(child, theme)
      }
    })
    .join('')
}

/**
 * Render MDXLD document to plain text for terminal
 *
 * @param doc - MDXLD document
 * @param options - Render options
 * @returns Plain text string
 */
export function renderToText(doc: MDXLDDocument, options: RenderOptions = {}): string {
  const opts = { ...defaultOptions, ...options }
  const ast = toAst(doc)
  const lines: string[] = []

  // Frontmatter
  if (opts.showFrontmatter && Object.keys(doc.data).length > 0) {
    lines.push('─'.repeat(40))
    for (const [key, value] of Object.entries(doc.data)) {
      lines.push(`${key}: ${formatValue(value)}`)
    }
    lines.push('─'.repeat(40))
    lines.push('')
  }

  // Content
  const contentNodes = ast.children.filter((n) => n.type !== 'yaml')
  lines.push(...renderNodesToText(contentNodes, opts))

  return lines.join('\n')
}

/**
 * Render nodes to text lines
 */
function renderNodesToText(nodes: MDXLDAstNode[], options: Required<RenderOptions>, indent = 0): string[] {
  const lines: string[] = []
  const indentStr = ' '.repeat(indent * options.indentSize)

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const depth = (node.depth as number) || 1
        const prefix = '#'.repeat(depth) + ' '
        lines.push('')
        lines.push(indentStr + prefix + getTextContent(node))
        lines.push('')
        break
      }

      case 'paragraph':
        lines.push(indentStr + getTextContent(node))
        lines.push('')
        break

      case 'code': {
        const lang = (node.lang as string) || ''
        lines.push(indentStr + '```' + lang)
        ;(node.value || '').split('\n').forEach((line) => {
          lines.push(indentStr + '  ' + line)
        })
        lines.push(indentStr + '```')
        lines.push('')
        break
      }

      case 'list': {
        const ordered = node.ordered as boolean
        const start = (node.start as number) || 1
        ;(node.children || []).forEach((item, i) => {
          const bullet = ordered ? `${start + i}. ` : '• '
          const content = getTextContent(item)
          lines.push(indentStr + bullet + content)
        })
        lines.push('')
        break
      }

      case 'blockquote':
        ;(node.children || []).forEach((child) => {
          lines.push(indentStr + '│ ' + getTextContent(child))
        })
        lines.push('')
        break

      case 'thematicBreak':
        lines.push(indentStr + '─'.repeat(options.maxWidth - indent * options.indentSize))
        lines.push('')
        break

      default:
        if (node.children) {
          lines.push(...renderNodesToText(node.children, options, indent))
        } else if (node.value) {
          lines.push(indentStr + node.value)
        }
    }
  }

  return lines
}

/**
 * Get text content from a node
 */
function getTextContent(node: MDXLDAstNode): string {
  if (node.value) return node.value
  if (!node.children) return ''
  return node.children.map(getTextContent).join('')
}

// Re-export types from mdxld
export type { MDXLDDocument, MDXLDAstNode } from 'mdxld'
export { parse, toAst } from 'mdxld'
