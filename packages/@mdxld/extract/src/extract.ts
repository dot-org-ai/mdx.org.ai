/**
 * @mdxld/extract - Bi-directional MDX ↔ Markdown translation
 *
 * Extracts structured data from rendered markdown using MDX templates.
 *
 * Forward:  MDX Template + Props → Rendered Markdown (standard MDX compilation)
 * Reverse:  Rendered Markdown + MDX Template → Props (this package)
 *
 * @packageDocumentation
 */

export interface ExtractOptions {
  /** MDX template content with {expression} slots */
  template: string
  /** Rendered markdown output */
  rendered: string
  /** Optional component extractors for reversing component output */
  components?: Record<string, ComponentExtractor>
  /** Use AI for ambiguous extractions */
  ai?: boolean
  /** AI model to use for extraction */
  model?: string
  /** Strict mode - fail if any slots are unmatched */
  strict?: boolean
}

export interface ComponentExtractor<T = Record<string, unknown>> {
  /** Pattern or function to extract props from rendered output */
  extract: (content: string) => T | null
  /** Optional schema describing the component's output format */
  schema?: Record<string, unknown>
  /** Optional pattern to identify component output in rendered content */
  pattern?: RegExp
}

export interface ExtractResult<T = Record<string, unknown>> {
  /** Extracted data matching template slots */
  data: T
  /** Confidence score 0-1 */
  confidence: number
  /** Slots that couldn't be extracted */
  unmatched: string[]
  /** Whether AI was used for extraction */
  aiAssisted: boolean
  /** Debug information about the extraction */
  debug?: ExtractDebugInfo
}

export interface ExtractDebugInfo {
  /** The slots found in the template */
  slots: TemplateSlot[]
  /** The regex pattern used for matching */
  pattern: string
  /** Whether the pattern matched */
  matched: boolean
  /** Raw match groups */
  groups?: Record<string, string>
}

/**
 * Slot in an MDX template
 */
export interface TemplateSlot {
  /** Expression path like 'data.title' or 'type.properties' */
  path: string
  /** Start position in template */
  start: number
  /** End position in template */
  end: number
  /** Type of slot: expression, component, conditional, loop */
  type: 'expression' | 'component' | 'conditional' | 'loop'
  /** For components: the component name */
  componentName?: string
  /** For components: the props expressions */
  componentProps?: Record<string, string>
  /** Original matched text */
  raw: string
}

/**
 * Diff between original and extracted data
 */
export interface ExtractDiff {
  /** Fields that were added */
  added: Record<string, unknown>
  /** Fields that were modified */
  modified: Record<string, { from: unknown; to: unknown }>
  /** Fields that were removed */
  removed: string[]
  /** Whether there are any changes */
  hasChanges: boolean
}

/**
 * Parse MDX template to find slots
 */
export function parseTemplateSlots(template: string): TemplateSlot[] {
  const slots: TemplateSlot[] = []

  // First find JSX component slots to know which ranges to exclude
  const componentRanges: Array<{ start: number; end: number }> = []

  // Self-closing components: <ComponentName prop={expr} />
  const selfClosingRegex = /<([A-Z]\w*)\s*([^>]*)\/>/g
  let match

  while ((match = selfClosingRegex.exec(template)) !== null) {
    const name = match[1]!
    const propsStr = match[2] || ''

    componentRanges.push({
      start: match.index,
      end: match.index + match[0].length
    })

    // Parse props
    const props: Record<string, string> = {}
    const propRegex = /(\w+)=\{([^}]+)\}/g
    let propMatch
    while ((propMatch = propRegex.exec(propsStr)) !== null) {
      props[propMatch[1]!] = propMatch[2]!.trim()
    }

    slots.push({
      path: name,
      start: match.index,
      end: match.index + match[0].length,
      type: 'component',
      componentName: name,
      componentProps: props,
      raw: match[0]
    })
  }

  // Block components: <ComponentName prop={expr}>...</ComponentName>
  const blockComponentRegex = /<([A-Z]\w*)\s*([^>]*)>([\s\S]*?)<\/\1>/g
  while ((match = blockComponentRegex.exec(template)) !== null) {
    const name = match[1]!
    const propsStr = match[2] || ''

    componentRanges.push({
      start: match.index,
      end: match.index + match[0].length
    })

    const props: Record<string, string> = {}
    const propRegex = /(\w+)=\{([^}]+)\}/g
    let propMatch
    while ((propMatch = propRegex.exec(propsStr)) !== null) {
      props[propMatch[1]!] = propMatch[2]!.trim()
    }

    slots.push({
      path: name,
      start: match.index,
      end: match.index + match[0].length,
      type: 'component',
      componentName: name,
      componentProps: props,
      raw: match[0]
    })
  }

  // Helper to check if a position is inside a component
  const isInsideComponent = (pos: number): boolean => {
    return componentRanges.some(range => pos >= range.start && pos < range.end)
  }

  // Find JSX expression slots: {data.title}
  // Only match expressions that are NOT inside component tags
  const exprRegex = /\{([^{}]+)\}/g
  while ((match = exprRegex.exec(template)) !== null) {
    // Skip if this expression is inside a component tag
    if (isInsideComponent(match.index)) {
      continue
    }

    const expr = match[1]!.trim()

    // Detect expression type
    let type: TemplateSlot['type'] = 'expression'

    if (expr.includes('?') && expr.includes(':')) {
      type = 'conditional'
    } else if (expr.includes('.map(') || expr.includes('.filter(') || expr.includes('.forEach(')) {
      type = 'loop'
    } else if (expr.includes('=>') || expr.includes('(')) {
      type = 'conditional' // Complex expression
    }

    slots.push({
      path: expr,
      start: match.index,
      end: match.index + match[0].length,
      type,
      raw: match[0]
    })
  }

  // Sort by position for consistent processing
  return slots.sort((a, b) => a.start - b.start)
}

/**
 * Escape regex special characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')
}

/**
 * Build a regex pattern from template for extraction
 */
function buildExtractionPattern(template: string, slots: TemplateSlot[]): { pattern: RegExp; slotNames: Map<string, string> } {
  // Sort slots by position ascending for sequential processing
  const sortedSlots = [...slots].sort((a, b) => a.start - b.start)

  let patternStr = ''
  let lastEnd = 0
  const slotNames = new Map<string, string>()

  for (let i = 0; i < sortedSlots.length; i++) {
    const slot = sortedSlots[i]!
    const isLastSlot = i === sortedSlots.length - 1

    // Escape the literal text between slots
    const literalText = template.slice(lastEnd, slot.start)
    patternStr += escapeRegex(literalText)

    // Generate a unique group name
    const groupName = slot.type === 'component'
      ? `component_${slot.componentName!.toLowerCase()}_${i}`
      : `slot_${slot.path.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${i}`

    slotNames.set(groupName, slot.path)

    if (slot.type === 'expression') {
      // Check if there's more content after this slot
      const remainingTemplate = template.slice(slot.end)
      const hasMoreContent = remainingTemplate.trim().length > 0

      if (isLastSlot && !hasMoreContent) {
        // Last slot with nothing after: use greedy match to end
        patternStr += `(?<${groupName}>.+)`
      } else {
        // Non-last slot or has content after: use non-greedy
        patternStr += `(?<${groupName}>.+?)`
      }
    } else if (slot.type === 'component') {
      // Component: capture multi-line content until next structural element
      patternStr += `(?<${groupName}>[\\s\\S]*?)`
    } else if (slot.type === 'conditional' || slot.type === 'loop') {
      // Complex expressions: capture any content
      patternStr += `(?<${groupName}>[\\s\\S]*?)`
    }

    lastEnd = slot.end
  }

  // Add remaining literal text
  const remainingLiteral = template.slice(lastEnd)
  patternStr += escapeRegex(remainingLiteral)

  // Normalize whitespace: allow flexible whitespace matching
  patternStr = patternStr.replace(/\\n/g, '\\s*')

  return {
    pattern: new RegExp(patternStr, 's'),
    slotNames
  }
}

/**
 * Convert a path like 'data.title' to a nested object setter
 */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[parts[parts.length - 1]!] = value
}

/**
 * Get a value from a nested object by path
 */
function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Extract structured data from rendered markdown using an MDX template
 *
 * @example
 * ```ts
 * const result = extract({
 *   template: '# {data.title}\n\n{data.description}',
 *   rendered: '# Hello World\n\nThis is my document.'
 * })
 *
 * console.log(result.data)
 * // { data: { title: 'Hello World', description: 'This is my document.' } }
 * ```
 */
export function extract<T = Record<string, unknown>>(options: ExtractOptions): ExtractResult<T> {
  const { template, rendered, components = {}, strict = false } = options

  // Parse template to find slots
  const slots = parseTemplateSlots(template)

  // Filter to pattern-matchable slots
  const matchableSlots = slots.filter(s => s.type === 'expression' || s.type === 'component')

  // Build extraction pattern
  const { pattern, slotNames } = buildExtractionPattern(template, matchableSlots)

  // Match rendered content
  const match = rendered.match(pattern)

  const data: Record<string, unknown> = {}
  const unmatched: string[] = []
  const debug: ExtractDebugInfo = {
    slots,
    pattern: pattern.source,
    matched: !!match,
    groups: match?.groups ? { ...match.groups } : undefined
  }

  if (match?.groups) {
    // Process expression slots
    for (const [groupName, path] of slotNames) {
      const slot = matchableSlots.find(s =>
        groupName.startsWith('slot_') && s.path === path
      )

      if (slot?.type === 'expression') {
        const value = match.groups[groupName]?.trim()
        if (value) {
          setPath(data, path, value)
        } else {
          unmatched.push(path)
        }
      }
    }

    // Process component slots with custom extractors
    for (const [groupName, path] of slotNames) {
      if (groupName.startsWith('component_')) {
        const componentName = path
        const extractor = components[componentName]
        const content = match.groups[groupName]?.trim()

        if (extractor && content) {
          const extracted = extractor.extract(content)
          if (extracted) {
            // Merge extracted data
            const slot = matchableSlots.find(s =>
              s.type === 'component' && s.componentName === componentName
            )
            if (slot?.componentProps) {
              // Map extracted data to the prop paths
              for (const [propName, propPath] of Object.entries(slot.componentProps)) {
                if (propName in extracted) {
                  setPath(data, propPath, extracted[propName])
                }
              }
            }
          }
        } else if (!extractor) {
          unmatched.push(`<${componentName} />`)
        }
      }
    }
  } else {
    // Pattern didn't match - all slots unmatched
    unmatched.push(...matchableSlots.map(s =>
      s.type === 'component' ? `<${s.componentName} />` : s.path
    ))
  }

  // Add conditional/loop slots to unmatched (they require AI)
  const complexSlots = slots.filter(s => s.type === 'conditional' || s.type === 'loop')
  unmatched.push(...complexSlots.map(s => s.path))

  // Calculate confidence
  const totalSlots = slots.length
  const matchedSlots = totalSlots - unmatched.length
  const confidence = totalSlots > 0 ? matchedSlots / totalSlots : 1

  if (strict && unmatched.length > 0) {
    throw new ExtractError(
      `Failed to extract ${unmatched.length} slots: ${unmatched.join(', ')}`,
      { unmatched, debug }
    )
  }

  return {
    data: data as T,
    confidence,
    unmatched,
    aiAssisted: false,
    debug
  }
}

/**
 * Error thrown during extraction
 */
export class ExtractError extends Error {
  constructor(
    message: string,
    public readonly details: { unmatched: string[]; debug: ExtractDebugInfo }
  ) {
    super(message)
    this.name = 'ExtractError'
  }
}

/**
 * Extract with AI assistance for ambiguous patterns
 *
 * Uses AI to infer structure when pattern matching fails or
 * when content has been heavily edited.
 */
export async function extractWithAI<T = Record<string, unknown>>(
  options: ExtractOptions
): Promise<ExtractResult<T>> {
  // First try pattern-based extraction
  const patternResult = extract<T>(options)

  // If confidence is high enough, return pattern result
  if (patternResult.confidence >= 0.8 && patternResult.unmatched.length === 0) {
    return patternResult
  }

  // Get the unmatched slots
  const slots = parseTemplateSlots(options.template)
  const unmatchedSlots = slots.filter(s =>
    patternResult.unmatched.includes(s.path) ||
    patternResult.unmatched.includes(`<${s.componentName} />`)
  )

  // Build a schema from unmatched slots for AI extraction
  const schema: Record<string, string> = {}
  for (const slot of unmatchedSlots) {
    if (slot.type === 'expression') {
      schema[slot.path] = `Extract the value for ${slot.path} from the content`
    } else if (slot.type === 'conditional') {
      schema[slot.path] = `Determine the value that produced this conditional output`
    } else if (slot.type === 'loop') {
      schema[slot.path] = `Extract the array of items from the repeated content`
    }
  }

  // TODO: Integrate with ai-functions generateObject
  // For now, return the pattern result with aiAssisted flag
  // This would be:
  // const aiResult = await generateObject({
  //   model: options.model || 'sonnet',
  //   schema,
  //   prompt: `Given this MDX template:\n${options.template}\n\nAnd this rendered content:\n${options.rendered}\n\nExtract the values for the missing fields.`
  // })

  return {
    ...patternResult,
    aiAssisted: true
  }
}

/**
 * Create a round-trip component that supports both render and extract
 *
 * @example
 * ```ts
 * const PropertyTable = roundTripComponent({
 *   render: (props: { properties: Property[] }) => {
 *     return `| Name | Type |\n|---|---|\n${props.properties.map(p =>
 *       `| ${p.name} | ${p.type} |`
 *     ).join('\n')}`
 *   },
 *   extract: (content: string) => {
 *     const rows = content.split('\n').slice(2)
 *     return {
 *       properties: rows.map(row => {
 *         const [, name, type] = row.split('|').map(s => s.trim())
 *         return { name, type }
 *       })
 *     }
 *   }
 * })
 * ```
 */
export function roundTripComponent<P extends Record<string, unknown>>(config: {
  render: (props: P) => string
  extract: (content: string) => P | null
  /** Optional pattern to identify this component's output */
  pattern?: RegExp
}): {
  render: (props: P) => string
  extract: (content: string) => P | null
  extractor: ComponentExtractor<P>
} {
  return {
    render: config.render,
    extract: config.extract,
    extractor: {
      extract: config.extract,
      pattern: config.pattern
    }
  }
}

/**
 * Compute the diff between original data and extracted data
 */
export function diff(
  original: Record<string, unknown>,
  extracted: Record<string, unknown>,
  paths?: string[]
): ExtractDiff {
  const added: Record<string, unknown> = {}
  const modified: Record<string, { from: unknown; to: unknown }> = {}
  const removed: string[] = []

  // Helper to flatten paths
  function flattenPaths(obj: Record<string, unknown>, prefix = ''): string[] {
    const result: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result.push(...flattenPaths(value as Record<string, unknown>, path))
      } else {
        result.push(path)
      }
    }
    return result
  }

  const originalPaths = paths || flattenPaths(original)
  const extractedPaths = flattenPaths(extracted)

  // Check for added fields
  for (const path of extractedPaths) {
    const origValue = getPath(original, path)
    const extValue = getPath(extracted, path)

    if (origValue === undefined) {
      setPath(added, path, extValue)
    } else if (JSON.stringify(origValue) !== JSON.stringify(extValue)) {
      modified[path] = { from: origValue, to: extValue }
    }
  }

  // Check for removed fields
  for (const path of originalPaths) {
    if (getPath(extracted, path) === undefined) {
      removed.push(path)
    }
  }

  return {
    added,
    modified,
    removed,
    hasChanges: Object.keys(added).length > 0 ||
                Object.keys(modified).length > 0 ||
                removed.length > 0
  }
}

/**
 * Apply extracted data to original document, creating a merged result
 */
export function applyExtract<T extends Record<string, unknown>>(
  original: T,
  extracted: Record<string, unknown>,
  options?: {
    /** Only apply these paths */
    paths?: string[]
    /** Merge strategy for arrays */
    arrayMerge?: 'replace' | 'append' | 'prepend'
  }
): T {
  const result = JSON.parse(JSON.stringify(original)) as T

  function applyPath(path: string, value: unknown): void {
    const parts = path.split('.')
    let current: Record<string, unknown> = result

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }

    const lastKey = parts[parts.length - 1]!
    const origValue = current[lastKey]

    if (Array.isArray(origValue) && Array.isArray(value)) {
      switch (options?.arrayMerge) {
        case 'append':
          current[lastKey] = [...origValue, ...value]
          break
        case 'prepend':
          current[lastKey] = [...value, ...origValue]
          break
        default:
          current[lastKey] = value
      }
    } else {
      current[lastKey] = value
    }
  }

  // Flatten extracted paths and apply
  function flattenAndApply(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key

      if (options?.paths && !options.paths.includes(path)) {
        continue
      }

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flattenAndApply(value as Record<string, unknown>, path)
      } else {
        applyPath(path, value)
      }
    }
  }

  flattenAndApply(extracted)
  return result
}

/**
 * Validate that a template can be used for extraction
 * Returns warnings about slots that may not extract correctly
 */
export function validateTemplate(template: string): {
  valid: boolean
  slots: TemplateSlot[]
  warnings: string[]
  extractable: string[]
  needsAI: string[]
} {
  const slots = parseTemplateSlots(template)
  const warnings: string[] = []
  const extractable: string[] = []
  const needsAI: string[] = []

  for (const slot of slots) {
    if (slot.type === 'expression') {
      extractable.push(slot.path)
    } else if (slot.type === 'component') {
      warnings.push(`Component <${slot.componentName} /> requires a custom extractor`)
      needsAI.push(`<${slot.componentName} />`)
    } else if (slot.type === 'conditional') {
      warnings.push(`Conditional expression "${slot.path}" requires AI extraction`)
      needsAI.push(slot.path)
    } else if (slot.type === 'loop') {
      warnings.push(`Loop expression "${slot.path}" requires AI extraction`)
      needsAI.push(slot.path)
    }
  }

  return {
    valid: warnings.length === 0,
    slots,
    warnings,
    extractable,
    needsAI
  }
}
