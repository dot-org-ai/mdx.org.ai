import type { MDXLDDocument, MDXLDDocumentWithAST, MDXLDAst, MDXLDAstNode, ParseOptions } from './types.js'
import { parse as parseDocument } from './parse.js'
import { stringify as stringifyDocument } from './stringify.js'

/**
 * Simple YAML to AST node converter
 */
function yamlToAstNode(yamlContent: string): MDXLDAstNode {
  return {
    type: 'yaml',
    value: yamlContent,
  }
}

/**
 * Parse inline content into AST nodes (simplified)
 */
function parseInline(text: string): MDXLDAstNode[] {
  const nodes: MDXLDAstNode[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Check for inline code
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      nodes.push({ type: 'inlineCode', value: codeMatch[1] })
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Check for strong (bold)
    const strongMatch = remaining.match(/^\*\*([^*]+)\*\*/) || remaining.match(/^__([^_]+)__/)
    if (strongMatch) {
      nodes.push({ type: 'strong', children: [{ type: 'text', value: strongMatch[1] }] })
      remaining = remaining.slice(strongMatch[0].length)
      continue
    }

    // Check for emphasis (italic)
    const emMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/)
    if (emMatch) {
      nodes.push({ type: 'emphasis', children: [{ type: 'text', value: emMatch[1] }] })
      remaining = remaining.slice(emMatch[0].length)
      continue
    }

    // Check for links
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      nodes.push({
        type: 'link',
        url: linkMatch[2],
        children: [{ type: 'text', value: linkMatch[1] }],
      })
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Check for images
    const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      nodes.push({
        type: 'image',
        alt: imageMatch[1],
        url: imageMatch[2],
      })
      remaining = remaining.slice(imageMatch[0].length)
      continue
    }

    // Plain text - consume until next special character or end
    const textMatch = remaining.match(/^[^`*_\[!]+/)
    if (textMatch) {
      nodes.push({ type: 'text', value: textMatch[0] })
      remaining = remaining.slice(textMatch[0].length)
      continue
    }

    // Single special character as text
    nodes.push({ type: 'text', value: remaining[0] })
    remaining = remaining.slice(1)
  }

  return nodes
}

/**
 * Parse MDX content into AST
 */
function contentToAst(content: string): MDXLDAstNode[] {
  const nodes: MDXLDAstNode[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        depth: headingMatch[1]!.length,
        children: parseInline(headingMatch[2]!),
      })
      i++
      continue
    }

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++

      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!)
        i++
      }

      nodes.push({
        type: 'code',
        lang: lang || undefined,
        value: codeLines.join('\n'),
      })
      i++ // Skip closing ```
      continue
    }

    // Thematic break
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ type: 'thematicBreak' })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i]!.startsWith('>') || (lines[i]!.trim() !== '' && quoteLines.length > 0))) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      nodes.push({
        type: 'blockquote',
        children: contentToAst(quoteLines.join('\n')),
      })
      continue
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const listItems: MDXLDAstNode[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i]!)) {
        const itemContent = lines[i]!.replace(/^[-*+]\s/, '')
        listItems.push({
          type: 'listItem',
          children: [{ type: 'paragraph', children: parseInline(itemContent) }],
        })
        i++
      }
      nodes.push({
        type: 'list',
        ordered: false,
        children: listItems,
      })
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: MDXLDAstNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        const itemContent = lines[i]!.replace(/^\d+\.\s/, '')
        listItems.push({
          type: 'listItem',
          children: [{ type: 'paragraph', children: parseInline(itemContent) }],
        })
        i++
      }
      nodes.push({
        type: 'list',
        ordered: true,
        children: listItems,
      })
      continue
    }

    // MDX JSX elements
    if (line.trim().startsWith('<') && !line.trim().startsWith('</')) {
      const jsxMatch = line.match(/^<(\w+)([^>]*)>/)
      if (jsxMatch) {
        const tagName = jsxMatch[1]
        const attrs = jsxMatch[2]?.trim()

        // Self-closing
        if (line.trim().endsWith('/>')) {
          nodes.push({
            type: 'mdxJsxFlowElement',
            name: tagName,
            attributes: attrs ? parseJsxAttributes(attrs.replace(/\/$/, '').trim()) : [],
            children: [],
          })
          i++
          continue
        }

        // Opening tag - find closing
        const jsxLines: string[] = [line]
        let depth = 1
        i++

        while (i < lines.length && depth > 0) {
          const currentLine = lines[i]!
          jsxLines.push(currentLine)

          if (currentLine.includes(`<${tagName}`)) depth++
          if (currentLine.includes(`</${tagName}>`)) depth--

          i++
        }

        nodes.push({
          type: 'mdxJsxFlowElement',
          name: tagName,
          attributes: attrs ? parseJsxAttributes(attrs) : [],
          children: contentToAst(jsxLines.slice(1, -1).join('\n')),
        })
        continue
      }
    }

    // MDX expressions
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      nodes.push({
        type: 'mdxFlowExpression',
        value: line.trim().slice(1, -1),
      })
      i++
      continue
    }

    // ESM imports/exports
    if (line.startsWith('import ') || line.startsWith('export ')) {
      nodes.push({
        type: 'mdxjsEsm',
        value: line,
      })
      i++
      continue
    }

    // Paragraph - collect consecutive non-empty lines
    const paraLines: string[] = []
    while (i < lines.length && lines[i]!.trim() !== '' && !isBlockStart(lines[i]!)) {
      paraLines.push(lines[i]!)
      i++
    }

    if (paraLines.length > 0) {
      nodes.push({
        type: 'paragraph',
        children: parseInline(paraLines.join('\n')),
      })
    }
  }

  return nodes
}

/**
 * Check if a line starts a new block element
 */
function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    line.startsWith('```') ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    line.startsWith('>') ||
    line.trim().startsWith('<') ||
    (line.trim().startsWith('{') && line.trim().endsWith('}')) ||
    line.startsWith('import ') ||
    line.startsWith('export ')
  )
}

/**
 * Parse JSX attributes string into array of attribute objects
 */
function parseJsxAttributes(attrString: string): Array<{ name: string; value?: unknown }> {
  const attrs: Array<{ name: string; value?: unknown }> = []
  const regex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g
  let match

  while ((match = regex.exec(attrString)) !== null) {
    const name = match[1]!
    const value = match[2] ?? match[3] ?? match[4]
    attrs.push({ name, value })
  }

  return attrs
}

/**
 * Convert AST back to content string
 */
function astToContent(nodes: MDXLDAstNode[]): string {
  return nodes.map((node) => nodeToString(node)).join('\n\n')
}

/**
 * Convert a single AST node to string
 */
function nodeToString(node: MDXLDAstNode): string {
  switch (node.type) {
    case 'yaml':
      return '' // YAML is handled separately

    case 'heading':
      return `${'#'.repeat(node.depth as number)} ${childrenToString(node.children || [])}`

    case 'paragraph':
      return childrenToString(node.children || [])

    case 'text':
      return node.value || ''

    case 'emphasis':
      return `*${childrenToString(node.children || [])}*`

    case 'strong':
      return `**${childrenToString(node.children || [])}**`

    case 'inlineCode':
      return `\`${node.value || ''}\``

    case 'code':
      return `\`\`\`${node.lang || ''}\n${node.value || ''}\n\`\`\``

    case 'link':
      return `[${childrenToString(node.children || [])}](${node.url || ''})`

    case 'image':
      return `![${node.alt || ''}](${node.url || ''})`

    case 'list': {
      const items = (node.children || []).map((item, i) => {
        const prefix = node.ordered ? `${i + 1}. ` : '- '
        const content = childrenToString(item.children || [])
        return `${prefix}${content}`
      })
      return items.join('\n')
    }

    case 'listItem':
      return childrenToString(node.children || [])

    case 'blockquote': {
      const content = astToContent(node.children || [])
      return content
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    }

    case 'thematicBreak':
      return '---'

    case 'mdxJsxFlowElement': {
      const attrs = (node.attributes as Array<{ name: string; value?: unknown }>) || []
      const attrStr = attrs.map((a) => (a.value !== undefined ? `${a.name}="${a.value}"` : a.name)).join(' ')
      const openTag = attrStr ? `<${node.name} ${attrStr}>` : `<${node.name}>`
      const children = node.children || []

      if (children.length === 0) {
        return `<${node.name}${attrStr ? ` ${attrStr}` : ''} />`
      }

      return `${openTag}\n${astToContent(children)}\n</${node.name}>`
    }

    case 'mdxFlowExpression':
      return `{${node.value || ''}}`

    case 'mdxjsEsm':
      return node.value || ''

    default:
      return node.value || childrenToString(node.children || [])
  }
}

/**
 * Convert children nodes to string
 */
function childrenToString(children: MDXLDAstNode[]): string {
  return children.map((child) => nodeToString(child)).join('')
}

/**
 * Parse MDXLD content and include AST
 *
 * @param content - Raw MDXLD string content
 * @param options - Parse options
 * @returns MDXLD document with AST property
 */
export function parseWithAst(content: string, options: ParseOptions = {}): MDXLDDocumentWithAST {
  const doc = parseDocument(content, options)
  const ast = toAst(doc)

  return {
    ...doc,
    ast,
  }
}

/**
 * Convert an MDXLD document to AST
 *
 * @param doc - MDXLD document
 * @returns AST representation
 */
export function toAst(doc: MDXLDDocument): MDXLDAst {
  const children: MDXLDAstNode[] = []

  // Add YAML node if there's data
  if (Object.keys(doc.data).length > 0 || doc.id || doc.type || doc.context) {
    children.push(yamlToAstNode(stringifyDocument(doc).match(/^---\n([\s\S]*?)\n---/)?.[1] || ''))
  }

  // Parse content into AST nodes
  const contentNodes = contentToAst(doc.content)
  children.push(...contentNodes)

  return {
    type: 'root',
    children,
  }
}

/**
 * Convert AST back to MDXLD document
 *
 * @param ast - AST representation
 * @param options - Parse options for interpreting YAML
 * @returns MDXLD document
 */
export function fromAst(ast: MDXLDAst, options: ParseOptions = {}): MDXLDDocument {
  const yamlNode = ast.children.find((n) => n.type === 'yaml')
  const contentNodes = ast.children.filter((n) => n.type !== 'yaml')

  let content = astToContent(contentNodes)

  // Reconstruct full document string if we have YAML
  if (yamlNode && yamlNode.value) {
    const fullContent = `---\n${yamlNode.value}\n---\n\n${content}`
    return parseDocument(fullContent, options)
  }

  return {
    data: {},
    content,
  }
}

/**
 * Stringify AST back to MDXLD string
 *
 * @param ast - AST representation
 * @returns String representation
 */
export function stringifyAst(ast: MDXLDAst): string {
  const yamlNode = ast.children.find((n) => n.type === 'yaml')
  const contentNodes = ast.children.filter((n) => n.type !== 'yaml')

  const content = astToContent(contentNodes)

  if (yamlNode && yamlNode.value) {
    return `---\n${yamlNode.value}\n---\n\n${content}`
  }

  return content
}
