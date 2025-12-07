/**
 * @mdxld/html
 *
 * Bi-directional conversion between Objects and semantic HTML.
 * Produces clean, accessible HTML with Schema.org microdata.
 */

import type { DocumentFormat, FormatFetchOptions } from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface ToHTMLOptions {
  /** Include microdata attributes (default: true) */
  microdata?: boolean
  /** HTML5 semantic elements (default: true) */
  semantic?: boolean
  /** Schema.org @type for root element */
  itemtype?: string
  /** Wrap in full HTML document */
  document?: boolean
  /** Pretty print with indentation */
  pretty?: boolean
  /** Indentation string (default: '  ') */
  indent?: string
}

export interface FromHTMLOptions {
  /** Extract microdata */
  microdata?: boolean
  /** Strict mode - throw on parse errors */
  strict?: boolean
}

export interface PropertyDef {
  name: string
  type?: string
  required?: boolean
  description?: string
}

export interface EntityDef {
  name: string
  type?: string
  description?: string
  properties?: PropertyDef[]
  sections?: Array<{ name: string; content?: string }>
  items?: string[]
}

// ============================================================================
// Utilities
// ============================================================================

/** Escape HTML special characters */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Convert camelCase to kebab-case */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Infer Schema.org type from object shape */
function inferSchemaOrgType(obj: Record<string, unknown>): string | undefined {
  if ('email' in obj && 'name' in obj) {
    return typeof obj.jobTitle === 'string' ? 'Person' : 'Organization'
  }
  if ('streetAddress' in obj || 'addressLocality' in obj) {
    return 'PostalAddress'
  }
  if ('startDate' in obj && 'endDate' in obj) {
    return 'Event'
  }
  if ('ingredients' in obj && 'instructions' in obj) {
    return 'Recipe'
  }
  if ('headline' in obj && 'author' in obj) {
    return 'Article'
  }
  if ('properties' in obj && Array.isArray(obj.properties)) {
    return 'Class'
  }
  return 'Thing'
}

/** Get Schema.org URL for type */
function getSchemaOrgURL(type: string): string {
  return `https://schema.org/${type}`
}

// ============================================================================
// toHTML
// ============================================================================

/**
 * Convert an object to semantic HTML with microdata.
 *
 * @example
 * ```ts
 * const html = toHTML({
 *   name: 'Acme Corp',
 *   email: 'hello@acme.com'
 * }, { itemtype: 'Organization' })
 * ```
 */
export function toHTML<T extends Record<string, unknown>>(
  object: T,
  options: ToHTMLOptions = {}
): string {
  const {
    microdata = true,
    semantic = true,
    itemtype,
    document: wrapDocument = false,
    pretty = true,
    indent = '  ',
  } = options

  const schemaType = itemtype || inferSchemaOrgType(object)
  const lines: string[] = []
  let depth = 0

  const addLine = (line: string) => {
    if (pretty) {
      lines.push(indent.repeat(depth) + line)
    } else {
      lines.push(line)
    }
  }

  // Document wrapper
  if (wrapDocument) {
    lines.push('<!DOCTYPE html>')
    lines.push('<html lang="en">')
    lines.push('<head>')
    lines.push('  <meta charset="UTF-8">')
    if ('name' in object) {
      lines.push(`  <title>${escapeHTML(String(object.name))}</title>`)
    }
    lines.push('</head>')
    lines.push('<body>')
    depth = 1
  }

  // Root element with microdata
  const rootTag = semantic ? 'article' : 'div'
  const microdataAttrs = microdata && schemaType
    ? ` itemscope itemtype="${getSchemaOrgURL(schemaType)}"`
    : ''

  addLine(`<${rootTag}${microdataAttrs}>`)
  depth++

  // Name as heading
  if ('name' in object && typeof object.name === 'string') {
    const nameAttr = microdata ? ' itemprop="name"' : ''
    addLine(`<h1${nameAttr}>${escapeHTML(object.name)}</h1>`)
  }

  // Description as paragraph
  if ('description' in object && typeof object.description === 'string') {
    const descAttr = microdata ? ' itemprop="description"' : ''
    addLine(`<p${descAttr}>${escapeHTML(object.description)}</p>`)
  }

  // Properties as definition list or table
  if ('properties' in object && Array.isArray(object.properties)) {
    const props = object.properties as PropertyDef[]

    addLine('<table>')
    depth++
    addLine('<thead>')
    depth++
    addLine('<tr>')
    depth++
    addLine('<th>Property</th>')
    addLine('<th>Type</th>')
    addLine('<th>Required</th>')
    addLine('<th>Description</th>')
    depth--
    addLine('</tr>')
    depth--
    addLine('</thead>')
    addLine('<tbody>')
    depth++

    for (const prop of props) {
      addLine('<tr>')
      depth++
      addLine(`<td><code>${escapeHTML(prop.name)}</code></td>`)
      addLine(`<td><code>${escapeHTML(prop.type || 'string')}</code></td>`)
      addLine(`<td>${prop.required ? '✓' : ''}</td>`)
      addLine(`<td>${escapeHTML(prop.description || '')}</td>`)
      depth--
      addLine('</tr>')
    }

    depth--
    addLine('</tbody>')
    depth--
    addLine('</table>')
  }

  // Sections
  if ('sections' in object && Array.isArray(object.sections)) {
    for (const section of object.sections as Array<{ name: string; content?: string }>) {
      const sectionTag = semantic ? 'section' : 'div'
      addLine(`<${sectionTag}>`)
      depth++
      addLine(`<h2>${escapeHTML(section.name)}</h2>`)
      if (section.content) {
        addLine(`<p>${escapeHTML(section.content)}</p>`)
      }
      depth--
      addLine(`</${sectionTag}>`)
    }
  }

  // Items as list
  if ('items' in object && Array.isArray(object.items)) {
    addLine('<ul>')
    depth++
    for (const item of object.items) {
      addLine(`<li>${escapeHTML(String(item))}</li>`)
    }
    depth--
    addLine('</ul>')
  }

  // Simple key-value properties
  const skipKeys = new Set(['name', 'description', 'properties', 'sections', 'items'])
  const otherProps = Object.entries(object).filter(([key]) => !skipKeys.has(key))

  if (otherProps.length > 0) {
    addLine('<dl>')
    depth++
    for (const [key, value] of otherProps) {
      const propAttr = microdata ? ` itemprop="${toKebabCase(key)}"` : ''
      addLine(`<dt>${escapeHTML(key)}</dt>`)
      addLine(`<dd${propAttr}>${escapeHTML(String(value))}</dd>`)
    }
    depth--
    addLine('</dl>')
  }

  depth--
  addLine(`</${rootTag}>`)

  // Close document
  if (wrapDocument) {
    lines.push('</body>')
    lines.push('</html>')
  }

  return pretty ? lines.join('\n') : lines.join('')
}

// ============================================================================
// fromHTML
// ============================================================================

/**
 * Extract structured data from HTML.
 *
 * @example
 * ```ts
 * const obj = fromHTML<Customer>(html)
 * ```
 */
export function fromHTML<T = Record<string, unknown>>(
  html: string,
  _options: FromHTMLOptions = {}
): T {
  const result: Record<string, unknown> = {}

  // Extract name from h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    result.name = h1Match[1].trim()
  }

  // Extract description from p with itemprop="description" or first p
  const descMatch = html.match(/<p[^>]*itemprop="description"[^>]*>([^<]+)<\/p>/i)
    || html.match(/<p[^>]*>([^<]+)<\/p>/i)
  if (descMatch && descMatch[1]) {
    result.description = descMatch[1].trim()
  }

  // Extract list items
  const listItems: string[] = []
  const liRegex = /<li[^>]*>([^<]+)<\/li>/gi
  let liMatch
  while ((liMatch = liRegex.exec(html)) !== null) {
    if (liMatch[1]) listItems.push(liMatch[1].trim())
  }
  if (listItems.length > 0) {
    result.items = listItems
  }

  // Extract table properties
  const tableMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i)
  if (tableMatch && tableMatch[1]) {
    const properties: PropertyDef[] = []
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
      if (!rowMatch[1]) continue
      const cells: string[] = []
      const cellRegex = /<td[^>]*>(?:<code>)?([^<]+)(?:<\/code>)?<\/td>/gi
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        if (cellMatch[1]) cells.push(cellMatch[1].trim())
      }
      if (cells.length >= 2 && cells[0]) {
        properties.push({
          name: cells[0],
          type: cells[1] || 'string',
          required: cells[2] === '✓',
          description: cells[3] || undefined,
        })
      }
    }
    if (properties.length > 0) {
      result.properties = properties
    }
  }

  // Extract definition list properties
  const dlMatch = html.match(/<dl>([\s\S]*?)<\/dl>/i)
  if (dlMatch && dlMatch[1]) {
    const dtRegex = /<dt>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi
    let dtMatch
    while ((dtMatch = dtRegex.exec(dlMatch[1])) !== null) {
      if (dtMatch[1] && dtMatch[2]) {
        const key = dtMatch[1].trim()
        const value = dtMatch[2].trim()
        result[key] = value
      }
    }
  }

  // Extract sections
  const sections: Array<{ name: string; content?: string }> = []
  const sectionRegex = /<(?:section|div)[^>]*>\s*<h2[^>]*>([^<]+)<\/h2>(?:\s*<p>([^<]+)<\/p>)?/gi
  let sectionMatch
  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    if (sectionMatch[1]) {
      sections.push({
        name: sectionMatch[1].trim(),
        content: sectionMatch[2]?.trim(),
      })
    }
  }
  if (sections.length > 0) {
    result.sections = sections
  }

  return result as T
}

/**
 * Generate JSON-LD script tag from object.
 */
export function toJSONLDScript<T extends Record<string, unknown>>(
  object: T,
  options: { type?: string } = {}
): string {
  const schemaType = options.type || inferSchemaOrgType(object)

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    ...object,
  }

  return `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch HTML from URL and parse.
 *
 * @example
 * ```ts
 * const doc = await fetchHTML('https://example.com/page.html')
 * ```
 */
export async function fetchHTML<T = Record<string, unknown>>(
  url: string,
  options: FormatFetchOptions & FromHTMLOptions = {}
): Promise<T> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return fromHTML<T>(text, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * HTML Format object implementing the standard Format interface.
 *
 * @example
 * ```ts
 * import { HTML } from '@mdxld/html'
 *
 * const data = HTML.parse('<h1>Title</h1>')
 * const str = HTML.stringify(data)
 * const remote = await HTML.fetch('https://example.com/page.html')
 * ```
 */
export const HTML: DocumentFormat<Record<string, unknown>, FromHTMLOptions, ToHTMLOptions> = {
  name: 'html',
  mimeTypes: ['text/html', 'application/xhtml+xml'] as const,
  extensions: ['html', 'htm', 'xhtml'] as const,
  parse: fromHTML,
  stringify: toHTML,
  fetch: fetchHTML,
  extractMeta(input: string): Record<string, unknown> {
    // Extract meta tags from HTML head
    const meta: Record<string, unknown> = {}

    // Extract title
    const titleMatch = input.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
      meta.title = titleMatch[1].trim()
    }

    // Extract meta name/content pairs
    const metaRegex = /<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]+)"/gi
    let match
    while ((match = metaRegex.exec(input)) !== null) {
      if (match[1] && match[2]) {
        meta[match[1]] = match[2]
      }
    }

    return meta
  },
}

// Default export
export default HTML
