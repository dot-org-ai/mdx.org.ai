/**
 * The one GitHub-flavoured markdown table primitive in the repo (mdx-8je.12).
 *
 * `toMarkdown` / `fromMarkdown` here and the entity components in `@mdxld/extract` all render and
 * parse tables through these two functions, so a table written by one is read by the other.
 */

export interface MarkdownTable {
  /** Header cells, trimmed, in column order */
  headers: string[]
  /** One record per body row, keyed by header cell; missing cells are '' */
  rows: Record<string, string>[]
}

export interface RenderTableOptions {
  /**
   * Separator row style:
   * - 'compact': `|---|---|`
   * - 'padded': dashes as wide as each header cell, `|----------|------|`
   * @default 'compact'
   */
  separator?: 'compact' | 'padded'
}

/** Split one `| a | b |` line into trimmed cells, keeping empty cells positional. */
function splitRow(line: string): string[] {
  let inner = line.trim()
  if (inner.startsWith('|')) inner = inner.slice(1)
  if (inner.endsWith('|')) inner = inner.slice(0, -1)
  return inner.split('|').map((cell) => cell.trim())
}

/** True for the `|---|:--:|` row that separates a table's header from its body. */
export function isTableSeparator(line: string): boolean {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)*\s*:?-{3,}:?\s*\|?\s*$/.test(line) && line.includes('-')
}

/** True for a line that reads as a table row. */
export function isTableRow(line: string): boolean {
  return line.trim().startsWith('|')
}

/**
 * Parse a markdown table into headers and rows. The first line is the header, the second the
 * separator (skipped when present), the rest are body rows. Cells are trimmed; a row shorter than
 * the header gets '' for the missing columns.
 *
 * @example
 * ```ts
 * parseTable('| name | slug |\n|---|---|\n| JavaScript | javascript |')
 * // { headers: ['name', 'slug'], rows: [{ name: 'JavaScript', slug: 'javascript' }] }
 * ```
 */
export function parseTable(content: string): MarkdownTable {
  const lines = content.split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = splitRow(lines[0]!)
  const body = isTableSeparator(lines[1]!) ? lines.slice(2) : lines.slice(1)

  const rows = body.map((line) => {
    const cells = splitRow(line)
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? ''
    })
    return row
  })

  return { headers, rows }
}

/** A cell's text: '' for null/undefined, JSON for objects, String() for the rest. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Render headers and rows as a markdown table. Rows may be records keyed by header or arrays in
 * header order.
 *
 * @example
 * ```ts
 * renderTable(['name', 'slug'], [{ name: 'JavaScript', slug: 'javascript' }])
 * // '| name | slug |\n|---|---|\n| JavaScript | javascript |'
 * ```
 */
export function renderTable(
  headers: readonly string[],
  rows: ReadonlyArray<Readonly<Record<string, unknown>> | readonly unknown[]>,
  options: RenderTableOptions = {}
): string {
  const header = `| ${headers.join(' | ')} |`
  const separator = options.separator === 'padded' ? `|${headers.map((h) => '-'.repeat(h.length + 2)).join('|')}|` : `|${headers.map(() => '---').join('|')}|`
  const body = rows.map((row) => {
    const cells = Array.isArray(row)
      ? headers.map((_, i) => cellText((row as readonly unknown[])[i]))
      : headers.map((h) => cellText((row as Record<string, unknown>)[h]))
    return `| ${cells.join(' | ')} |`
  })
  return [header, separator, ...body].join('\n')
}
