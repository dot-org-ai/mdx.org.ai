/**
 * @mdxui/markdown - Render MDXLD documents to clean markdown
 *
 * String-to-string rendering without going through HTML.
 *
 * @packageDocumentation
 */

import { parse, stringify, type MDXLDDocument } from 'mdxld'
import { toAst, type MDXLDAst, type MDXLDAstNode } from '@mdxld/ast'

/**
 * Get a property from an AST node with type safety
 */
function getNodeProp<T>(node: MDXLDAstNode, prop: string): T | undefined {
  return (node as unknown as Record<string, unknown>)[prop] as T | undefined
}

/**
 * Options for rendering markdown
 */
export interface RenderOptions {
  /**
   * Include YAML frontmatter in output
   * @default true
   */
  includeFrontmatter?: boolean

  /**
   * How to handle JSX elements
   * - 'strip': Remove JSX elements entirely
   * - 'placeholder': Replace with a placeholder comment
   * - 'raw': Keep as raw text (may not be valid markdown)
   * @default 'strip'
   */
  jsxHandling?: 'strip' | 'placeholder' | 'raw'

  /**
   * How to handle MDX expressions
   * - 'strip': Remove expressions entirely
   * - 'placeholder': Replace with a placeholder
   * - 'raw': Keep as raw text
   * @default 'strip'
   */
  expressionHandling?: 'strip' | 'placeholder' | 'raw'

  /**
   * Bullet character for unordered lists
   * @default '-'
   */
  bulletChar?: '-' | '*' | '+'

  /**
   * Use setext-style headings (underlined) for h1 and h2
   * @default false
   */
  setextHeadings?: boolean

  /**
   * Character for thematic breaks
   * @default '---'
   */
  thematicBreak?: '---' | '***' | '___'

  /**
   * Emphasis character
   * @default '*'
   */
  emphasisChar?: '*' | '_'

  /**
   * Strong character (doubled)
   * @default '**'
   */
  strongChar?: '**' | '__'

  /**
   * Code fence character
   * @default '```'
   */
  codeFence?: '```' | '~~~'
}

const defaultOptions: Required<RenderOptions> = {
  includeFrontmatter: true,
  jsxHandling: 'strip',
  expressionHandling: 'strip',
  bulletChar: '-',
  setextHeadings: false,
  thematicBreak: '---',
  emphasisChar: '*',
  strongChar: '**',
  codeFence: '```',
}

/**
 * Render an MDXLD document to markdown string
 *
 * @param doc - MDXLD document to render
 * @param options - Render options
 * @returns Rendered markdown string
 *
 * @example
 * ```ts
 * import { render } from '@mdxui/markdown'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(`---
 * title: Hello
 * ---
 *
 * # Hello World
 *
 * This is **bold** and *italic*.
 * `)
 *
 * const markdown = render(doc)
 * ```
 */
export function render(doc: MDXLDDocument, options: RenderOptions = {}): string {
  const opts = { ...defaultOptions, ...options }
  const ast = toAst(doc)

  const parts: string[] = []

  // Handle frontmatter
  if (opts.includeFrontmatter && Object.keys(doc.data).length > 0) {
    const frontmatter = stringify({ ...doc, content: '' }, { mode: 'expanded' }).trim()
    if (frontmatter) {
      parts.push(frontmatter)
      parts.push('')
    }
  }

  // Render AST content (skip yaml node)
  const contentNodes = ast.children.filter((n: MDXLDAstNode) => n.type !== 'yaml')
  const content = renderNodes(contentNodes, opts)

  if (content) {
    parts.push(content)
  }

  return parts.join('\n')
}

/**
 * Render raw MDXLD content string to markdown
 *
 * @param content - Raw MDXLD content string
 * @param options - Render options
 * @returns Rendered markdown string
 *
 * @example
 * ```ts
 * import { renderString } from '@mdxui/markdown'
 *
 * const markdown = renderString(`---
 * title: Hello
 * ---
 *
 * # Hello World
 * `)
 * ```
 */
export function renderString(content: string, options: RenderOptions = {}): string {
  const doc = parse(content)
  return render(doc, options)
}

/**
 * Render just the content portion (no frontmatter)
 *
 * @param content - Raw content string (markdown/MDX)
 * @param options - Render options
 * @returns Rendered markdown string
 */
export function renderContent(content: string, options: RenderOptions = {}): string {
  const doc: MDXLDDocument = { data: {}, content }
  return render(doc, { ...options, includeFrontmatter: false })
}

/**
 * Render AST nodes to markdown string
 */
function renderNodes(nodes: MDXLDAstNode[], opts: Required<RenderOptions>): string {
  return nodes.map((node) => renderNode(node, opts)).join('\n\n')
}

/**
 * Render a single AST node to markdown
 */
function renderNode(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  switch (node.type) {
    case 'heading':
      return renderHeading(node, opts)
    case 'paragraph':
      return renderParagraph(node, opts)
    case 'text':
      return node.value || ''
    case 'emphasis':
      return renderEmphasis(node, opts)
    case 'strong':
      return renderStrong(node, opts)
    case 'inlineCode':
      return `\`${node.value || ''}\``
    case 'code':
      return renderCodeBlock(node, opts)
    case 'link':
      return renderLink(node, opts)
    case 'image':
      return renderImage(node)
    case 'list':
      return renderList(node, opts)
    case 'listItem':
      return renderListItem(node, opts)
    case 'blockquote':
      return renderBlockquote(node, opts)
    case 'thematicBreak':
      return opts.thematicBreak
    case 'html':
      return node.value || ''
    case 'break':
      return '  \n'
    case 'delete':
      return `~~${renderInlineChildren(node, opts)}~~`

    // MDX-specific elements
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return renderJsx(node, opts)
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return renderExpression(node, opts)
    case 'mdxjsEsm':
      return renderEsm(node, opts)

    // Table elements
    case 'table':
      return renderTable(node, opts)
    case 'tableRow':
      return renderTableRow(node, opts)
    case 'tableCell':
      return renderInlineChildren(node, opts)

    // Definition elements
    case 'definition':
      return renderDefinition(node)
    case 'footnoteDefinition':
      return renderFootnoteDefinition(node, opts)
    case 'footnoteReference':
      return `[^${getNodeProp<string>(node, 'identifier') || getNodeProp<string>(node, 'label') || ''}]`

    default:
      // For unknown nodes, try to render children
      if (node.children && node.children.length > 0) {
        return renderNodes(node.children, opts)
      }
      return node.value || ''
  }
}

/**
 * Render inline children of a node
 */
function renderInlineChildren(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  if (!node.children) return node.value || ''
  return node.children.map((child) => renderNode(child, opts)).join('')
}

/**
 * Render a heading
 */
function renderHeading(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const depth = (node.depth as number) || 1
  const content = renderInlineChildren(node, opts)

  if (opts.setextHeadings && depth <= 2) {
    const underline = depth === 1 ? '=' : '-'
    return `${content}\n${underline.repeat(content.length)}`
  }

  return `${'#'.repeat(depth)} ${content}`
}

/**
 * Render a paragraph
 */
function renderParagraph(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  return renderInlineChildren(node, opts)
}

/**
 * Render emphasis (italic)
 */
function renderEmphasis(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const content = renderInlineChildren(node, opts)
  return `${opts.emphasisChar}${content}${opts.emphasisChar}`
}

/**
 * Render strong (bold)
 */
function renderStrong(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const content = renderInlineChildren(node, opts)
  return `${opts.strongChar}${content}${opts.strongChar}`
}

/**
 * Render a code block
 */
function renderCodeBlock(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const lang = (node.lang as string) || ''
  const meta = (node.meta as string) || ''
  const value = node.value || ''

  const fence = opts.codeFence
  const info = meta ? `${lang} ${meta}` : lang

  return `${fence}${info}\n${value}\n${fence}`
}

/**
 * Render a link
 */
function renderLink(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const content = renderInlineChildren(node, opts)
  const url = (node.url as string) || ''
  const title = node.title as string

  if (title) {
    return `[${content}](${url} "${title}")`
  }
  return `[${content}](${url})`
}

/**
 * Render an image
 */
function renderImage(node: MDXLDAstNode): string {
  const alt = (node.alt as string) || ''
  const url = (node.url as string) || ''
  const title = node.title as string

  if (title) {
    return `![${alt}](${url} "${title}")`
  }
  return `![${alt}](${url})`
}

/**
 * Render a list
 */
function renderList(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const ordered = getNodeProp<boolean>(node, 'ordered') ?? false
  const start = getNodeProp<number>(node, 'start') ?? 1

  if (!node.children) return ''

  return node.children
    .map((item, index) => {
      const prefix = ordered ? `${start + index}. ` : `${opts.bulletChar} `
      const content = renderListItem(item, opts)

      // Handle multi-line list items
      const lines = content.split('\n')
      const indented = lines
        .map((line, i) => {
          if (i === 0) return prefix + line
          return '   ' + line
        })
        .join('\n')

      return indented
    })
    .join('\n')
}

/**
 * Render a list item
 */
function renderListItem(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  if (!node.children) return ''

  // Check if it's a task list item
  const checked = getNodeProp<boolean | null>(node, 'checked')
  let prefix = ''
  if (checked !== null && checked !== undefined) {
    prefix = checked ? '[x] ' : '[ ] '
  }

  const content = node.children
    .map((child) => {
      if (child.type === 'paragraph') {
        return renderInlineChildren(child, opts)
      }
      return renderNode(child, opts)
    })
    .join('\n')

  return prefix + content
}

/**
 * Render a blockquote
 */
function renderBlockquote(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  if (!node.children) return '>'

  const content = node.children.map((child) => renderNode(child, opts)).join('\n\n')

  return content
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

/**
 * Render a table
 */
function renderTable(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  if (!node.children || node.children.length === 0) return ''

  const align = getNodeProp<(string | null)[]>(node, 'align') ?? []
  const rows = node.children

  // Render header row
  const headerRow = rows[0]
  if (!headerRow || !headerRow.children) return ''

  const headerCells = headerRow.children.map((cell) => renderInlineChildren(cell, opts))
  const header = `| ${headerCells.join(' | ')} |`

  // Render separator
  const separator = headerCells.map((_, i) => {
    const alignment = align[i]
    if (alignment === 'left') return ':---'
    if (alignment === 'right') return '---:'
    if (alignment === 'center') return ':---:'
    return '---'
  })
  const sep = `| ${separator.join(' | ')} |`

  // Render body rows
  const bodyRows = rows.slice(1).map((row) => {
    if (!row.children) return '|  |'
    const cells = row.children.map((cell) => renderInlineChildren(cell, opts))
    return `| ${cells.join(' | ')} |`
  })

  return [header, sep, ...bodyRows].join('\n')
}

/**
 * Render a table row (used when table is not detected)
 */
function renderTableRow(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  if (!node.children) return ''
  const cells = node.children.map((cell) => renderInlineChildren(cell, opts))
  return `| ${cells.join(' | ')} |`
}

/**
 * Render a link/image definition
 */
function renderDefinition(node: MDXLDAstNode): string {
  const identifier = getNodeProp<string>(node, 'identifier') || getNodeProp<string>(node, 'label') || ''
  const url = getNodeProp<string>(node, 'url') || ''
  const title = getNodeProp<string>(node, 'title')

  if (title) {
    return `[${identifier}]: ${url} "${title}"`
  }
  return `[${identifier}]: ${url}`
}

/**
 * Render a footnote definition
 */
function renderFootnoteDefinition(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  const identifier = getNodeProp<string>(node, 'identifier') || getNodeProp<string>(node, 'label') || ''
  const content = node.children ? renderNodes(node.children, opts) : ''
  return `[^${identifier}]: ${content}`
}

/**
 * Render JSX element based on options
 */
function renderJsx(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  switch (opts.jsxHandling) {
    case 'strip':
      return ''
    case 'placeholder': {
      const name = (node.name as string) || 'Component'
      return `<!-- JSX: <${name} /> -->`
    }
    case 'raw': {
      // Try to reconstruct JSX
      const name = (node.name as string) || ''
      const children = node.children ? renderNodes(node.children, opts) : ''
      if (children) {
        return `<${name}>${children}</${name}>`
      }
      return `<${name} />`
    }
  }
}

/**
 * Render MDX expression based on options
 */
function renderExpression(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  switch (opts.expressionHandling) {
    case 'strip':
      return ''
    case 'placeholder':
      return '<!-- expression -->'
    case 'raw':
      return `{${node.value || ''}}`
  }
}

/**
 * Render ESM import/export based on options
 */
function renderEsm(node: MDXLDAstNode, opts: Required<RenderOptions>): string {
  switch (opts.expressionHandling) {
    case 'strip':
      return ''
    case 'placeholder':
      return '<!-- import/export -->'
    case 'raw':
      return node.value || ''
  }
}

// Alias for backward compatibility
export { render as renderMarkdown }

// Re-export types from mdxld for convenience
export type { MDXLDDocument, MDXLDAst, MDXLDAstNode } from 'mdxld'
