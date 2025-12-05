/**
 * @mdxui/html - Semantic HTML5 components and MDXLD document renderer
 *
 * This package provides:
 * - React components for semantic HTML5 structure (no classes needed)
 * - MDXLD document to HTML string rendering
 *
 * CSS is provided by @mdxui/css - import separately:
 * import '@mdxui/css'
 */

export const name = '@mdxui/html'

// Re-export all semantic HTML components
export * from './components/layouts'
export * from './components/sections'
export * from './components/views'
export * from './components/containers'
export * from './components/waitlist'
export * from './components/pages'

// Re-export types
export * from './types/layouts'

import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

export interface HTMLRenderOptions {
  /** Include DOCTYPE and html wrapper */
  fullDocument?: boolean
  /** Pretty print HTML */
  pretty?: boolean
  /** CSS styles to inject */
  styles?: string[]
  /** Inline CSS */
  inlineStyles?: string
  /** Script URLs to include */
  scripts?: string[]
  /** Custom wrapper element */
  wrapper?: string | React.ComponentType<{ children: ReactNode }>
  /** Custom component mapping */
  components?: Record<string, React.ComponentType<unknown>>
  /** Enable syntax highlighting for code blocks */
  syntaxHighlight?: boolean
  /** Document title (overrides frontmatter) */
  title?: string
  /** Meta tags */
  meta?: Record<string, string>
  /** Base URL for relative links */
  baseUrl?: string
}

export interface HTMLOutput {
  html: string
  title?: string
  description?: string
  meta: Record<string, string>
}

/**
 * Render an MDXLD document to HTML
 */
export async function toHTML(
  doc: MDXLDDocument,
  options: HTMLRenderOptions = {}
): Promise<HTMLOutput> {
  const {
    fullDocument = true,
    pretty = false,
    styles = [],
    inlineStyles,
    scripts = [],
    wrapper = 'article',
    title: optionsTitle,
    meta: optionsMeta = {},
  } = options

  // Extract metadata from document
  const title = optionsTitle || (doc.data.title as string) || (doc.data.name as string)
  const description = (doc.data.description as string) || undefined

  // Build meta tags
  const meta: Record<string, string> = {
    ...optionsMeta,
  }
  if (description) {
    meta.description = description
  }
  if (doc.type) {
    const typeValue = Array.isArray(doc.type) ? doc.type[0] : doc.type
    if (typeValue) {
      meta['og:type'] = typeValue
    }
  }

  // Render content to HTML
  const contentHtml = await renderContent(doc, options)

  // Wrap in wrapper element
  const wrappedHtml = wrapContent(contentHtml, wrapper)

  // Build full document if requested
  let html: string
  if (fullDocument) {
    html = buildFullDocument({
      title,
      meta,
      styles,
      inlineStyles,
      scripts,
      content: wrappedHtml,
    })
  } else {
    html = wrappedHtml
  }

  // Pretty print if requested
  if (pretty) {
    html = prettifyHtml(html)
  }

  return {
    html,
    title,
    description,
    meta,
  }
}

/**
 * Render to HTML string (convenience function)
 */
export async function renderToHtml(
  doc: MDXLDDocument,
  options: HTMLRenderOptions = {}
): Promise<string> {
  const result = await toHTML(doc, options)
  return result.html
}

/**
 * Render to static markup (no React attributes)
 */
export async function renderToStaticHtml(
  doc: MDXLDDocument,
  options: HTMLRenderOptions = {}
): Promise<string> {
  const contentHtml = await renderContent(doc, { ...options, static: true })

  if (options.fullDocument !== false) {
    return buildFullDocument({
      title: (doc.data.title as string) || undefined,
      meta: {},
      styles: options.styles || [],
      scripts: options.scripts || [],
      content: contentHtml,
    })
  }

  return contentHtml
}

/**
 * Render just the content portion
 */
async function renderContent(
  doc: MDXLDDocument,
  options: HTMLRenderOptions & { static?: boolean } = {}
): Promise<string> {
  const { components = {}, static: isStatic = false } = options

  // Convert markdown content to HTML
  // This is a simplified implementation - full version would use MDX compiler
  const html = markdownToHtml(doc.content, components)

  return html
}

/**
 * Convert markdown to HTML
 * Simplified implementation - full version would compile MDX
 */
function markdownToHtml(
  markdown: string,
  _components: Record<string, React.ComponentType<unknown>>
): string {
  let html = markdown

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`
  })

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr />')

  // Lists (simplified)
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')

  // Paragraphs - wrap remaining text
  const lines = html.split('\n\n')
  html = lines
    .map((line) => {
      line = line.trim()
      if (!line) return ''
      if (line.startsWith('<')) return line
      return `<p>${line}</p>`
    })
    .join('\n')

  return html
}

/**
 * Wrap content in wrapper element
 */
function wrapContent(
  content: string,
  wrapper: string | React.ComponentType<{ children: ReactNode }>
): string {
  if (typeof wrapper === 'string') {
    return `<${wrapper}>${content}</${wrapper}>`
  }

  // React component wrapper
  const element = createElement(wrapper, { children: content })
  return renderToStaticMarkup(element as ReactElement)
}

/**
 * Build a full HTML document
 */
function buildFullDocument(options: {
  title?: string
  meta: Record<string, string>
  styles: string[]
  inlineStyles?: string
  scripts: string[]
  content: string
}): string {
  const { title, meta, styles, inlineStyles, scripts, content } = options

  const metaTags = Object.entries(meta)
    .map(([name, content]) => `<meta name="${name}" content="${escapeHtml(content)}" />`)
    .join('\n    ')

  const styleTags = styles
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join('\n    ')

  const inlineStyleTag = inlineStyles ? `<style>${inlineStyles}</style>` : ''

  const scriptTags = scripts
    .map((src) => `<script src="${src}"></script>`)
    .join('\n    ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${title ? `<title>${escapeHtml(title)}</title>` : ''}
    ${metaTags}
    ${styleTags}
    ${inlineStyleTag}
</head>
<body>
    ${content}
    ${scriptTags}
</body>
</html>`
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Pretty print HTML (simplified)
 */
function prettifyHtml(html: string): string {
  // Simple indentation - full implementation would use a proper formatter
  let indent = 0
  const lines = html.split('\n')

  return lines
    .map((line) => {
      line = line.trim()
      if (!line) return ''

      // Decrease indent for closing tags
      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1)
      }

      const indented = '  '.repeat(indent) + line

      // Increase indent for opening tags (not self-closing)
      if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) {
        indent++
      }

      return indented
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Create a simple component for rendering
 */
export function createHTMLComponent<P extends Record<string, unknown>>(
  render: (props: P) => string
): React.FC<P> {
  return (props: P) => {
    const html = render(props)
    return createElement('div', { dangerouslySetInnerHTML: { __html: html } })
  }
}

// Types are already exported where they are declared above
