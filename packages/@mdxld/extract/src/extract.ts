/**
 * @mdxld/extract - Bi-directional MDX ↔ Markdown translation
 *
 * Extracts structured data from rendered markdown using MDX templates.
 *
 * Forward:  MDX Template + Props → Rendered Markdown (the `md` register of `@mdxui/text`)
 * Reverse:  Rendered Markdown + MDX Template → Props (this package)
 *
 * Diffing and merging the props that come back is `@mdxld/diff`'s job — the one diff
 * implementation in the repo (mdx-8je.12). This module re-exports its path-based primitives
 * under the names this package has always had (`diff`, `applyExtract`) and adds the 3-way
 * `mergeExtract` for the case where the props AND the markdown both changed.
 *
 * @packageDocumentation
 */

import {
  applyPaths,
  diffPaths,
  merge3wayObjects,
  type ApplyPathsOptions,
  type ObjectMergeOptions,
  type ObjectMergeResult,
  type PathDiff,
} from '@mdxld/diff'

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
  /**
   * The rendered text captured for each conditional / loop slot (keyed by the slot's expression)
   * and for each component slot without an extractor (keyed by `<Name />`). The pattern matcher
   * cannot reverse these; {@link extractWithAI} hands them to the model.
   */
  regions?: Record<string, string>
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
 * Diff between original and extracted data — `@mdxld/diff`'s {@link PathDiff}.
 */
export type ExtractDiff = PathDiff

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

  // Find JSX expression slots: {data.title}, brace-balanced so a loop body with a template
  // literal (`- ${f.title}`) is one slot. Only match expressions that are NOT inside component tags
  for (const { start, end, expr } of balancedBraces(template)) {
    // Skip if this expression is inside a component tag
    if (isInsideComponent(start)) {
      continue
    }

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
      start,
      end,
      type,
      raw: template.slice(start, end)
    })
  }

  // Sort by position for consistent processing
  return slots.sort((a, b) => a.start - b.start)
}

/**
 * Every top-level `{…}` in the template with its inner text trimmed, matching braces by depth
 * so nested braces (a template literal's `${…}`, an object literal) stay inside their slot.
 * An unclosed `{` and an empty `{}` are not slots.
 */
function balancedBraces(template: string): Array<{ start: number; end: number; expr: string }> {
  const out: Array<{ start: number; end: number; expr: string }> = []
  let i = 0
  while (i < template.length) {
    if (template[i] !== '{') {
      i++
      continue
    }
    let depth = 0
    let j = i
    for (; j < template.length; j++) {
      if (template[j] === '{') depth++
      else if (template[j] === '}' && --depth === 0) break
    }
    if (j >= template.length) break // unclosed
    const expr = template.slice(i + 1, j).trim()
    if (expr !== '') out.push({ start: i, end: j + 1, expr })
    i = j + 1
  }
  return out
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

    // Check if there's more content after this slot
    const remainingTemplate = template.slice(slot.end)
    const trailing = isLastSlot && remainingTemplate.trim().length === 0

    if (slot.type === 'expression') {
      // Last slot with nothing after: greedy to the end; otherwise non-greedy up to the next literal
      patternStr += trailing ? `(?<${groupName}>.+)` : `(?<${groupName}>.+?)`
    } else {
      // Component, conditional or loop output: any multi-line content, lazily up to the next
      // literal (greedy when nothing follows). Capturing it keeps the scalars beside a loop
      // extractable and hands the region to extractWithAI.
      patternStr += trailing ? `(?<${groupName}>[\\s\\S]*)` : `(?<${groupName}>[\\s\\S]*?)`
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

  // Build extraction pattern over every slot: expression and component slots are reversed
  // here, conditional / loop slots (and components without an extractor) are only captured
  // as regions for extractWithAI
  const { pattern, slotNames } = buildExtractionPattern(template, slots)

  // Match rendered content
  const match = rendered.match(pattern)

  const data: Record<string, unknown> = {}
  const unmatched: string[] = []
  const regions: Record<string, string> = {}
  const debug: ExtractDebugInfo = {
    slots,
    pattern: pattern.source,
    matched: !!match,
    groups: match?.groups ? { ...match.groups } : undefined,
    regions
  }

  if (match?.groups) {
    // Process expression slots
    for (const [groupName, path] of slotNames) {
      const slot = slots.find(s =>
        groupName.startsWith('slot_') && s.path === path
      )

      if (slot?.type === 'expression') {
        const value = match.groups[groupName]?.trim()
        if (value) {
          setPath(data, path, value)
        } else {
          unmatched.push(path)
        }
      } else if (slot?.type === 'conditional' || slot?.type === 'loop') {
        regions[path] = match.groups[groupName]?.trim() ?? ''
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
            const slot = slots.find(s =>
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
          regions[`<${componentName} />`] = content ?? ''
        }
      }
    }
  } else {
    // Pattern didn't match - all expression and component slots unmatched
    unmatched.push(...slots
      .filter(s => s.type === 'expression' || s.type === 'component')
      .map(s => s.type === 'component' ? `<${s.componentName} />` : s.path))
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
 * What {@link extractWithAI} asks the model for: an `ai-functions` `generateObject` call.
 * `schema` is ai-functions' simplified schema syntax — a nested object whose leaves are
 * descriptions (a string) or a one-element array of a description (a list).
 */
export interface AIGenerateArgs {
  model: string
  schema: Record<string, unknown>
  prompt: string
  system: string
}

/** The generator {@link extractWithAI} calls — `generateObject` from `ai-functions` by default. */
export type AIGenerate = (args: AIGenerateArgs) => Promise<{ object: Record<string, unknown> }>

export interface ExtractWithAIOptions extends ExtractOptions {
  /**
   * The generator to call for the slots the pattern matcher could not reverse. Defaults to
   * `generateObject` from `ai-functions` (an optional peer dependency); pass one to test
   * without a model or to route through your own client.
   */
  generate?: AIGenerate
}

/** One slot the pattern matcher left for the model: where its value lands and how to ask. */
interface AITarget {
  /** Dotted data path the model's answer lands at */
  path: string
  /** The `unmatched` entries this target answers */
  unmatched: string[]
  /** True when the slot renders a list (a `.map(` loop) */
  list: boolean
  /** What to tell the model */
  description: string
}

const CALL_METHODS = /\.(map|filter|forEach|flatMap|reduce|join|slice|sort|some|every|find)\b/

/**
 * The data path an expression reads: `data.show ? "Yes" : "No"` → `data.show`,
 * `data.items.map(i => i.name)` → `data.items`. Undefined when the expression does not start
 * with an identifier chain.
 */
export function expressionPath(expression: string): string | undefined {
  const head = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/.exec(expression.trim())?.[1]
  if (!head) return undefined
  const call = CALL_METHODS.exec(head)
  return call ? head.slice(0, call.index) : head
}

function aiTargets(slots: TemplateSlot[], unmatched: string[], regions: Record<string, string>): AITarget[] {
  const byPath = new Map<string, AITarget>()
  const add = (path: string, key: string, list: boolean, description: string) => {
    const existing = byPath.get(path)
    if (existing) {
      existing.unmatched.push(key)
      existing.list ||= list
      existing.description += `\n${description}`
    } else {
      byPath.set(path, { path, unmatched: [key], list, description })
    }
  }

  for (const slot of slots) {
    if (slot.type === 'component') {
      const key = `<${slot.componentName} />`
      if (!unmatched.includes(key)) continue
      const region = regions[key]
      for (const [propName, propExpr] of Object.entries(slot.componentProps ?? {})) {
        const path = expressionPath(propExpr)
        if (!path) continue
        add(path, key, false, `${path}: the "${propName}" prop of ${key}, reconstructed from what the component rendered${region ? `:\n${region}` : ''}`)
      }
      continue
    }

    if (!unmatched.includes(slot.path)) continue

    if (slot.type === 'expression') {
      add(slot.path, slot.path, false, `${slot.path}: the value of {${slot.path}} in the rendered content`)
      continue
    }

    const path = expressionPath(slot.path)
    if (!path) continue
    const region = regions[slot.path]
    if (slot.type === 'loop') {
      add(path, slot.path, true, `${path}: every item of the list that {${slot.path}} rendered as${region ? `:\n${region}` : ''}`)
    } else {
      add(path, slot.path, false, `${path}: the value that makes {${slot.path}} render as${region ? `:\n${region}` : ' the content shown'}`)
    }
  }

  return [...byPath.values()]
}

async function defaultGenerate(): Promise<AIGenerate> {
  let mod: { generateObject?: unknown }
  try {
    mod = (await import('ai-functions')) as { generateObject?: unknown }
  } catch (cause) {
    throw new Error(
      'extractWithAI needs ai-functions for the slots the pattern matcher cannot reverse: install it (pnpm add ai-functions) or pass { generate }',
      { cause }
    )
  }
  const generateObject = mod.generateObject as (args: AIGenerateArgs) => Promise<{ object: Record<string, unknown> }>
  if (typeof generateObject !== 'function') {
    throw new Error('extractWithAI: the installed ai-functions exports no generateObject')
  }
  return (args) => generateObject(args)
}

/**
 * Extract with AI assistance for the slots the pattern matcher cannot reverse
 *
 * Runs {@link extract} first. Every slot it leaves unmatched — a conditional, a loop, a
 * component without an extractor, or an expression the edited content no longer matches — is
 * put to the model in one `generateObject` call, together with the template, the rendered
 * content and the region captured for each slot. The answers are merged into the data at the
 * expression's path (`{data.items.map(...)}` lands at `data.items`).
 *
 * @example
 * ```ts
 * const result = await extractWithAI({
 *   template: '# {data.title}\n\n{data.tags.map(t => `- ${t}`).join("\\n")}',
 *   rendered: '# Hello\n\n- a\n- b',
 * })
 * result.data // { data: { title: 'Hello', tags: ['a', 'b'] } }
 * result.aiAssisted // true
 * ```
 */
export async function extractWithAI<T = Record<string, unknown>>(
  options: ExtractWithAIOptions
): Promise<ExtractResult<T>> {
  // First try pattern-based extraction (strictness is enforced after the model has had its turn)
  const patternResult = extract<T>({ ...options, strict: false })

  if (patternResult.unmatched.length === 0) return patternResult

  const slots = patternResult.debug?.slots ?? parseTemplateSlots(options.template)
  const regions = patternResult.debug?.regions ?? {}
  const targets = aiTargets(slots, patternResult.unmatched, regions)

  const data = JSON.parse(JSON.stringify(patternResult.data)) as Record<string, unknown>
  let unmatched = [...patternResult.unmatched]

  if (targets.length > 0) {
    const schema: Record<string, unknown> = {}
    for (const target of targets) {
      setPath(schema, target.path, target.list ? [target.description] : target.description)
    }

    const generate = options.generate ?? (await defaultGenerate())
    const { object } = await generate({
      model: options.model ?? 'sonnet',
      schema,
      system:
        'You reverse MDX templates. Given a template with {expression} slots and the markdown it rendered to, ' +
        'recover the values of the expressions. Return exactly the values that would render the given content; ' +
        'do not paraphrase, do not add fields.',
      prompt:
        `MDX template:\n\n${options.template}\n\n` +
        `Rendered content:\n\n${options.rendered}\n\n` +
        `Recover these values:\n${targets.map(t => `- ${t.description}`).join('\n')}`
    })

    for (const target of targets) {
      const value = getPath(object ?? {}, target.path) ?? (object ?? {})[target.path]
      if (value === undefined || value === null) continue
      setPath(data, target.path, value)
      unmatched = unmatched.filter(u => !target.unmatched.includes(u))
    }
  }

  const totalSlots = slots.length
  const confidence = totalSlots > 0 ? (totalSlots - unmatched.length) / totalSlots : 1

  if (options.strict && unmatched.length > 0) {
    throw new ExtractError(
      `Failed to extract ${unmatched.length} slots: ${unmatched.join(', ')}`,
      { unmatched, debug: patternResult.debug! }
    )
  }

  return {
    data: data as T,
    confidence,
    unmatched,
    aiAssisted: true,
    debug: patternResult.debug
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
 * Compute the diff between original data and extracted data (`@mdxld/diff`'s `diffPaths`)
 *
 * @param paths - Restrict the removal check to these paths (default: every leaf of `original`)
 */
export function diff(
  original: Record<string, unknown>,
  extracted: Record<string, unknown>,
  paths?: string[]
): ExtractDiff {
  return diffPaths(original, extracted, paths)
}

/**
 * Apply extracted data onto a copy of the original document (`@mdxld/diff`'s `applyPaths`).
 * Two-way: paths the template does not render are left alone.
 */
export function applyExtract<T extends Record<string, unknown>>(
  original: T,
  extracted: Record<string, unknown>,
  options?: ApplyPathsOptions
): T {
  return applyPaths(original, extracted, options)
}

export interface MergeExtractOptions extends ObjectMergeOptions {
  /** Only take these dotted paths from the extracted data */
  paths?: string[]
}

/**
 * 3-way merge for the case where the props AND the markdown both changed since the markdown
 * was rendered (`@mdxld/diff`'s `merge3wayObjects`).
 *
 * - `base`: the props the markdown was rendered from
 * - `current`: the props as they are now (edited through the record, "ours")
 * - `extracted`: what {@link extract} recovered from the edited markdown ("theirs")
 *
 * The extracted side only speaks for the paths the template renders: a path absent from
 * `extracted` is treated as unchanged there, never as deleted. A path changed on one side takes
 * that side; changed differently on both is a conflict — two strings are line-merged first —
 * resolved by `onConflict` ('ours' by default) and reported in `conflicts`.
 *
 * @example
 * ```ts
 * const base = { data: { title: 'Hello', author: 'Jane' } }
 * const current = { data: { title: 'Hello', author: 'Jane Doe' } }        // record edited
 * const { data } = extract({ template, rendered: '# Hello, world\n\n*By Jane*' }) // markdown edited
 *
 * mergeExtract(base, current, data).merged
 * // { data: { title: 'Hello, world', author: 'Jane Doe' } }
 * ```
 */
export function mergeExtract<T extends Record<string, unknown>>(
  base: T,
  current: Record<string, unknown>,
  extracted: Record<string, unknown>,
  options: MergeExtractOptions = {}
): ObjectMergeResult<T> {
  const { paths, ...merge } = options
  const theirs = applyPaths(base, extracted, { paths })
  return merge3wayObjects(base, current, theirs, merge)
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
