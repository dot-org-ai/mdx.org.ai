import type { MDXLDDocument, MDXLDDocumentWithCode, ParseOptions } from './types.js'
import { parse as parseDocument } from './parse.js'

/**
 * Compile options
 */
export interface CompileOptions {
  /**
   * Output format for the compiled code
   * - 'function-body': Returns code that can be wrapped in a function (default)
   * - 'module': Returns ES module code with exports
   */
  outputFormat?: 'function-body' | 'module'

  /**
   * JSX runtime to use
   * - 'automatic': Use React 17+ automatic JSX runtime (default)
   * - 'classic': Use classic React.createElement
   */
  jsxRuntime?: 'automatic' | 'classic'

  /**
   * JSX import source for automatic runtime
   * @default 'react'
   */
  jsxImportSource?: string

  /**
   * Whether to include source maps
   * @default false
   */
  sourceMap?: boolean

  /**
   * Development mode - includes extra debugging info
   * @default false
   */
  development?: boolean
}

/**
 * Escape string for use in JavaScript template literal
 */
function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/**
 * Convert markdown-like content to JSX elements
 */
function contentToJsx(content: string): string {
  const lines = content.split('\n')
  const jsxParts: string[] = []
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
      const level = headingMatch[1]!.length
      const text = escapeTemplateLiteral(headingMatch[2]!)
      jsxParts.push(`_jsx("h${level}", { children: \`${text}\` })`)
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

      const code = escapeTemplateLiteral(codeLines.join('\n'))
      const langAttr = lang ? `, "data-language": "${lang}"` : ''
      jsxParts.push(`_jsx("pre", { children: _jsx("code", { children: \`${code}\`${langAttr} }) })`)
      i++ // Skip closing ```
      continue
    }

    // Thematic break
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      jsxParts.push('_jsx("hr", {})')
      i++
      continue
    }

    // JSX passthrough - lines starting with < that look like JSX
    if (line.trim().startsWith('<') && !line.trim().startsWith('</')) {
      // Collect JSX block
      const jsxLines: string[] = [line]
      let depth = 1
      const tagMatch = line.match(/<(\w+)/)

      if (tagMatch && !line.trim().endsWith('/>')) {
        const tagName = tagMatch[1]
        i++

        while (i < lines.length && depth > 0) {
          const currentLine = lines[i]!
          jsxLines.push(currentLine)

          // Simple depth tracking
          const opens = (currentLine.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length
          const closes = (currentLine.match(new RegExp(`</${tagName}>`, 'g')) || []).length
          depth += opens - closes

          i++
        }
      } else {
        i++
      }

      // JSX is passed through as-is (user must ensure it's valid)
      jsxParts.push(jsxLines.join('\n'))
      continue
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i]!)) {
        const itemContent = escapeTemplateLiteral(lines[i]!.replace(/^[-*+]\s/, ''))
        listItems.push(`_jsx("li", { children: \`${itemContent}\` })`)
        i++
      }
      jsxParts.push(`_jsx("ul", { children: [${listItems.join(', ')}] })`)
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        const itemContent = escapeTemplateLiteral(lines[i]!.replace(/^\d+\.\s/, ''))
        listItems.push(`_jsx("li", { children: \`${itemContent}\` })`)
        i++
      }
      jsxParts.push(`_jsx("ol", { children: [${listItems.join(', ')}] })`)
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i]!.startsWith('>')) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      const quoteContent = escapeTemplateLiteral(quoteLines.join('\n'))
      jsxParts.push(`_jsx("blockquote", { children: \`${quoteContent}\` })`)
      continue
    }

    // Default: paragraph
    const paraLines: string[] = []
    while (i < lines.length && lines[i]!.trim() !== '' && !isBlockStart(lines[i]!)) {
      paraLines.push(lines[i]!)
      i++
    }

    if (paraLines.length > 0) {
      const text = escapeTemplateLiteral(paraLines.join(' '))
      jsxParts.push(`_jsx("p", { children: \`${text}\` })`)
    }
  }

  return jsxParts.join(',\n    ')
}

/**
 * Check if a line starts a block element
 */
function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    line.startsWith('```') ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    line.startsWith('>') ||
    line.trim().startsWith('<') ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())
  )
}

/**
 * Compile MDXLD document to JavaScript code
 *
 * @param doc - MDXLD document to compile
 * @param options - Compile options
 * @returns MDXLD document with code property
 *
 * @example
 * ```ts
 * const doc = parse(`---
 * title: Hello
 * ---
 *
 * # Hello World
 * `)
 *
 * const compiled = compile(doc)
 * // compiled.code contains JavaScript that exports an MDX component
 * ```
 */
export function compile(doc: MDXLDDocument, options: CompileOptions = {}): MDXLDDocumentWithCode {
  const { outputFormat = 'function-body', jsxRuntime = 'automatic', jsxImportSource = 'react', development = false } = options

  const jsxElements = contentToJsx(doc.content)

  let code: string

  if (outputFormat === 'module') {
    const importStatement =
      jsxRuntime === 'automatic'
        ? `import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "${jsxImportSource}/jsx-runtime";`
        : `import React from "react";`

    code = `${importStatement}

export const frontmatter = ${JSON.stringify(doc.data, null, 2)};

export const id = ${doc.id ? JSON.stringify(doc.id) : 'undefined'};
export const type = ${doc.type ? JSON.stringify(doc.type) : 'undefined'};
export const context = ${doc.context ? JSON.stringify(doc.context) : 'undefined'};

export default function MDXContent(props) {
  const _components = {
    ...props.components
  };
  return _jsx(_Fragment, {
    children: [
    ${jsxElements}
    ]
  });
}
`
  } else {
    // function-body format
    code = `const frontmatter = ${JSON.stringify(doc.data, null, 2)};

const id = ${doc.id ? JSON.stringify(doc.id) : 'undefined'};
const type = ${doc.type ? JSON.stringify(doc.type) : 'undefined'};
const context = ${doc.context ? JSON.stringify(doc.context) : 'undefined'};

function MDXContent(props) {
  const _components = {
    ...props.components
  };
  return _jsx(_Fragment, {
    children: [
    ${jsxElements}
    ]
  });
}

return { frontmatter, id, type, context, default: MDXContent };
`
  }

  if (development) {
    code = `/* MDXLD Compiled - Development Mode */\n${code}`
  }

  return {
    ...doc,
    code,
  }
}

/**
 * Parse and compile MDXLD content in one step
 *
 * @param content - Raw MDXLD string content
 * @param options - Combined parse and compile options
 * @returns Compiled MDXLD document
 */
export function compileFromString(content: string, options: ParseOptions & CompileOptions = {}): MDXLDDocumentWithCode {
  const { mode, ...compileOpts } = options
  const doc = parseDocument(content, { mode })
  return compile(doc, compileOpts)
}

/**
 * Evaluate compiled code and return the component
 *
 * Note: This uses Function constructor which has security implications.
 * Only use with trusted content.
 *
 * @param doc - Compiled MDXLD document
 * @param jsx - JSX factory function
 * @param jsxs - JSX factory for static children
 * @param Fragment - Fragment component
 * @returns Document with component property
 */
export function evaluate(
  doc: MDXLDDocumentWithCode,
  jsx: (type: unknown, props: unknown, key?: string) => unknown,
  jsxs: (type: unknown, props: unknown, key?: string) => unknown,
  Fragment: unknown
): MDXLDDocumentWithCode & { component: unknown } {
  if (!doc.code) {
    throw new Error('Document must be compiled before evaluation')
  }

  // Create function with JSX runtime in scope
  const fn = new Function('_jsx', '_jsxs', '_Fragment', doc.code)
  const result = fn(jsx, jsxs, Fragment)

  return {
    ...doc,
    component: result.default,
  }
}
