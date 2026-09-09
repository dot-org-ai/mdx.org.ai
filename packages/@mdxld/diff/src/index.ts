/**
 * @mdxld/diff
 *
 * Git-style diffing, patching, and 3-way merge for text and structured data.
 * Provides unified diff format, patch application, and conflict resolution.
 */

import * as Diff from 'diff'

// ============================================================================
// Types
// ============================================================================

export interface Change {
  /** The changed text content */
  value: string
  /** True if this was added */
  added?: boolean
  /** True if this was removed */
  removed?: boolean
  /** Number of lines (for line diffs) */
  count?: number
}

export interface DiffOptions {
  /** Ignore leading/trailing whitespace */
  ignoreWhitespace?: boolean
  /** Treat newline at end of file as significant */
  newlineIsToken?: boolean
  /** Ignore case differences */
  ignoreCase?: boolean
}

export interface PatchOptions {
  /** Number of context lines (default: 3) */
  context?: number
  /** Original filename for patch header */
  oldFileName?: string
  /** New filename for patch header */
  newFileName?: string
  /** Original file header */
  oldHeader?: string
  /** New file header */
  newHeader?: string
}

export interface Hunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface ParsedPatch {
  oldFileName?: string
  newFileName?: string
  oldHeader?: string
  newHeader?: string
  hunks: Hunk[]
  index?: string
}

export interface ApplyOptions {
  /** Fuzz factor for fuzzy matching (default: 0) */
  fuzzFactor?: number
  /** Compare function for matching */
  compareLine?: (lineNumber: number, line: string, operation: '-' | ' ', patchContent: string) => boolean
}

export interface ObjectDiff<T = unknown> {
  added: Record<string, T>
  removed: Record<string, T>
  modified: Record<string, { from: T; to: T }>
  unchanged: Record<string, T>
  hasChanges: boolean
}

export interface ArrayDiff<T = unknown> {
  added: Array<{ index: number; value: T }>
  removed: Array<{ index: number; value: T }>
  moved: Array<{ from: number; to: number; value: T }>
  hasChanges: boolean
}

export interface MergeResult {
  /** The merged text. Where {@link hasConflicts} is true it carries git-style conflict markers. */
  merged: string
  hasConflicts: boolean
  conflicts: ConflictRegion[]
}

export interface ConflictRegion {
  /** Line index in `merged` of the `<<<<<<<` marker */
  start: number
  /** Line index in `merged` of the `>>>>>>>` marker */
  end: number
  /** The base lines of the region, newline-terminated */
  base: string
  /** Our lines of the region, newline-terminated */
  ours: string
  /** Their lines of the region, newline-terminated */
  theirs: string
}

/**
 * A path-flattened diff between two structured values (the shape `@mdxld/extract` reports as
 * `ExtractDiff`). Keys are dotted leaf paths (`data.title`); arrays are leaves.
 */
export interface PathDiff {
  /** Leaf paths present in `extracted` but absent from `original`, as a nested object */
  added: Record<string, unknown>
  /** Leaf paths whose value changed, keyed by dotted path */
  modified: Record<string, { from: unknown; to: unknown }>
  /** Dotted leaf paths present in `original` but absent from `extracted` */
  removed: string[]
  hasChanges: boolean
}

export interface ApplyPathsOptions {
  /** Only apply these dotted paths */
  paths?: string[]
  /** Merge strategy when both sides hold an array at a path (default: 'replace') */
  arrayMerge?: 'replace' | 'append' | 'prepend'
}

export interface ObjectMergeOptions {
  /**
   * Which side wins a path both sides changed differently (default: 'ours').
   * The conflict is still reported in {@link ObjectMergeResult.conflicts}.
   */
  onConflict?: 'ours' | 'theirs' | 'base'
  /**
   * When both sides changed the same string, try a line-level {@link merge3way} of the two
   * texts before declaring a conflict (default: true).
   */
  mergeText?: boolean
}

export interface ObjectConflict {
  /** Dotted leaf path */
  path: string
  base: unknown
  ours: unknown
  theirs: unknown
  /** The side whose value was kept */
  resolution: 'ours' | 'theirs' | 'base'
}

export interface ObjectMergeResult<T = Record<string, unknown>> {
  merged: T
  hasConflicts: boolean
  conflicts: ObjectConflict[]
  /** Dotted paths taken from each side without conflict */
  applied: { ours: string[]; theirs: string[] }
}

// ============================================================================
// Text Diffing
// ============================================================================

/**
 * Diff two strings character by character.
 *
 * @example
 * ```ts
 * const changes = diffChars('hello', 'hallo')
 * // [{ value: 'h' }, { value: 'e', removed: true }, { value: 'a', added: true }, { value: 'llo' }]
 * ```
 */
export function diffChars(oldStr: string, newStr: string, options: DiffOptions = {}): Change[] {
  return Diff.diffChars(oldStr, newStr, {
    ignoreCase: options.ignoreCase,
  })
}

/**
 * Diff two strings word by word.
 *
 * @example
 * ```ts
 * const changes = diffWords('hello world', 'hello there')
 * ```
 */
export function diffWords(oldStr: string, newStr: string, options: DiffOptions = {}): Change[] {
  if (options.ignoreWhitespace) {
    return Diff.diffWordsWithSpace(oldStr, newStr, {
      ignoreCase: options.ignoreCase,
    })
  }
  return Diff.diffWords(oldStr, newStr, {
    ignoreCase: options.ignoreCase,
  })
}

/**
 * Diff two strings line by line.
 *
 * @example
 * ```ts
 * const changes = diffLines(oldContent, newContent)
 * for (const change of changes) {
 *   if (change.added) console.log('+', change.value)
 *   if (change.removed) console.log('-', change.value)
 * }
 * ```
 */
export function diffLines(oldStr: string, newStr: string, options: DiffOptions = {}): Change[] {
  return Diff.diffLines(oldStr, newStr, {
    ignoreWhitespace: options.ignoreWhitespace,
    newlineIsToken: options.newlineIsToken,
  })
}

/**
 * Diff trimmed lines (ignoring leading/trailing whitespace per line).
 */
export function diffTrimmedLines(oldStr: string, newStr: string): Change[] {
  return Diff.diffTrimmedLines(oldStr, newStr)
}

/**
 * Diff sentences.
 */
export function diffSentences(oldStr: string, newStr: string): Change[] {
  return Diff.diffSentences(oldStr, newStr)
}

// ============================================================================
// Unified Patches (Git-style)
// ============================================================================

/**
 * Create a unified diff patch (like `git diff`).
 *
 * @example
 * ```ts
 * const patch = createPatch('file.md', oldContent, newContent)
 * // Returns unified diff format string
 * ```
 */
export function createPatch(
  fileName: string,
  oldStr: string,
  newStr: string,
  options: PatchOptions = {}
): string {
  return Diff.createTwoFilesPatch(
    options.oldFileName || fileName,
    options.newFileName || fileName,
    oldStr,
    newStr,
    options.oldHeader,
    options.newHeader,
    { context: options.context ?? 3 }
  )
}

/**
 * Create a patch between two strings with custom filenames.
 */
export function createTwoFilesPatch(
  oldFileName: string,
  newFileName: string,
  oldStr: string,
  newStr: string,
  options: PatchOptions = {}
): string {
  return Diff.createTwoFilesPatch(
    oldFileName,
    newFileName,
    oldStr,
    newStr,
    options.oldHeader,
    options.newHeader,
    { context: options.context ?? 3 }
  )
}

/**
 * Parse a unified diff patch string into structured data.
 *
 * @example
 * ```ts
 * const patches = parsePatch(patchString)
 * for (const patch of patches) {
 *   console.log(patch.oldFileName, '→', patch.newFileName)
 * }
 * ```
 */
export function parsePatch(patch: string): ParsedPatch[] {
  return Diff.parsePatch(patch) as ParsedPatch[]
}

/**
 * Apply a patch to a string.
 *
 * @example
 * ```ts
 * const newContent = applyPatch(oldContent, patch)
 * if (newContent === false) {
 *   console.error('Patch failed to apply')
 * }
 * ```
 */
export function applyPatch(source: string, patch: string | ParsedPatch | ParsedPatch[], options: ApplyOptions = {}): string | false {
  return Diff.applyPatch(source, patch as string | Diff.ParsedDiff | [Diff.ParsedDiff], {
    fuzzFactor: options.fuzzFactor ?? 0,
    compareLine: options.compareLine,
  })
}

/**
 * Apply multiple patches to source strings.
 * Returns an array of results or false if any patch fails.
 */
export function applyPatches(
  patches: ParsedPatch[],
  options: {
    loadFile: (patch: ParsedPatch) => string
    patched: (patch: ParsedPatch, content: string) => void
    complete: (err?: Error) => void
  }
): void {
  Diff.applyPatches(patches as Diff.ParsedDiff[], {
    loadFile: (patch, callback) => {
      try {
        const content = options.loadFile(patch as ParsedPatch)
        callback(undefined, content)
      } catch (err) {
        callback(err as Error, '')
      }
    },
    patched: (patch, content, callback) => {
      options.patched(patch as ParsedPatch, content)
      callback(undefined)
    },
    complete: (err) => options.complete(err as Error | undefined),
  })
}

/**
 * Reverse a patch (swap additions and deletions).
 */
export function reversePatch(patch: ParsedPatch | ParsedPatch[]): ParsedPatch {
  return Diff.reversePatch(patch as Diff.ParsedDiff | Diff.ParsedDiff[]) as ParsedPatch
}

// ============================================================================
// Structured Patches
// ============================================================================

/**
 * Create a structured patch object (programmatic access to hunks).
 *
 * @example
 * ```ts
 * const patch = structuredPatch('file.md', 'file.md', oldContent, newContent)
 * for (const hunk of patch.hunks) {
 *   console.log(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`)
 * }
 * ```
 */
export function structuredPatch(
  oldFileName: string,
  newFileName: string,
  oldStr: string,
  newStr: string,
  options: PatchOptions = {}
): ParsedPatch {
  return Diff.structuredPatch(
    oldFileName,
    newFileName,
    oldStr,
    newStr,
    options.oldHeader,
    options.newHeader,
    { context: options.context ?? 3 }
  ) as ParsedPatch
}

// ============================================================================
// Object/JSON Diffing
// ============================================================================

/**
 * Diff two JSON objects, returning structured changes.
 *
 * @example
 * ```ts
 * const diff = diffObjects(
 *   { name: 'John', age: 30 },
 *   { name: 'John', age: 31, city: 'NYC' }
 * )
 * // { added: { city: 'NYC' }, removed: {}, modified: { age: { from: 30, to: 31 } }, hasChanges: true }
 * ```
 */
export function diffObjects<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T
): ObjectDiff {
  const added: Record<string, unknown> = {}
  const removed: Record<string, unknown> = {}
  const modified: Record<string, { from: unknown; to: unknown }> = {}
  const unchanged: Record<string, unknown> = {}

  const oldKeys = new Set(Object.keys(oldObj))
  const newKeys = new Set(Object.keys(newObj))

  // Find added keys
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      added[key] = newObj[key]
    }
  }

  // Find removed keys
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      removed[key] = oldObj[key]
    }
  }

  // Find modified and unchanged
  for (const key of oldKeys) {
    if (newKeys.has(key)) {
      const oldValue = oldObj[key]
      const newValue = newObj[key]

      if (!deepEqual(oldValue, newValue)) {
        modified[key] = { from: oldValue, to: newValue }
      } else {
        unchanged[key] = oldValue
      }
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    hasChanges: Object.keys(added).length > 0 ||
                Object.keys(removed).length > 0 ||
                Object.keys(modified).length > 0,
  }
}

/**
 * Diff two JSON strings, returning a unified diff.
 *
 * @example
 * ```ts
 * const patch = diffJSON(oldJSON, newJSON)
 * ```
 */
export function diffJSON(oldObj: unknown, newObj: unknown, options: PatchOptions = {}): string {
  const oldStr = JSON.stringify(oldObj, null, 2)
  const newStr = JSON.stringify(newObj, null, 2)
  return createPatch(options.oldFileName || 'object.json', oldStr, newStr, options)
}

/**
 * Diff two arrays, tracking additions, removals, and moves.
 */
export function diffArrays<T>(oldArr: T[], newArr: T[]): ArrayDiff<T> {
  const changes = Diff.diffArrays(oldArr, newArr)

  const added: Array<{ index: number; value: T }> = []
  const removed: Array<{ index: number; value: T }> = []
  let oldIndex = 0
  let newIndex = 0

  for (const change of changes) {
    if (change.removed) {
      for (const value of change.value as T[]) {
        removed.push({ index: oldIndex++, value })
      }
    } else if (change.added) {
      for (const value of change.value as T[]) {
        added.push({ index: newIndex++, value })
      }
    } else {
      oldIndex += (change.value as T[]).length
      newIndex += (change.value as T[]).length
    }
  }

  return {
    added,
    removed,
    moved: [], // Simple diff doesn't detect moves, would need LCS
    hasChanges: added.length > 0 || removed.length > 0,
  }
}

// ============================================================================
// 3-Way Merge
// ============================================================================

/**
 * Perform a 3-way merge (like git merge).
 *
 * @param base - The common ancestor
 * @param ours - Our version (current branch)
 * @param theirs - Their version (incoming branch)
 *
 * @example
 * ```ts
 * const result = merge3way(baseContent, ourContent, theirContent)
 * if (result.hasConflicts) {
 *   console.log('Merge conflicts:', result.conflicts)
 * } else {
 *   console.log('Clean merge:', result.merged)
 * }
 * ```
 */
export function merge3way(base: string, ours: string, theirs: string): MergeResult {
  const baseLines = splitLines(base)
  const oursHunks = hunksAgainst(baseLines.lines, splitLines(ours).lines)
  const theirsHunks = hunksAgainst(baseLines.lines, splitLines(theirs).lines)

  const out: string[] = []
  const conflicts: ConflictRegion[] = []
  let pos = 0
  let i = 0
  let j = 0

  while (i < oursHunks.length || j < theirsHunks.length) {
    // Seed a region with whichever side's next hunk starts first, then grow it while any hunk
    // on either side overlaps or touches it. Touching counts (git's rule): two changes with no
    // untouched base line between them cannot be ordered, so they conflict.
    const next = i < oursHunks.length && (j >= theirsHunks.length || oursHunks[i]!.start <= theirsHunks[j]!.start)
      ? oursHunks[i]!
      : theirsHunks[j]!
    let start = next.start
    let end = next.end
    const regionOurs: LineHunk[] = []
    const regionTheirs: LineHunk[] = []
    let grew = true
    while (grew) {
      grew = false
      while (i < oursHunks.length && touches(oursHunks[i]!, start, end)) {
        const h = oursHunks[i++]!
        regionOurs.push(h)
        start = Math.min(start, h.start)
        end = Math.max(end, h.end)
        grew = true
      }
      while (j < theirsHunks.length && touches(theirsHunks[j]!, start, end)) {
        const h = theirsHunks[j++]!
        regionTheirs.push(h)
        start = Math.min(start, h.start)
        end = Math.max(end, h.end)
        grew = true
      }
    }

    out.push(...baseLines.lines.slice(pos, start))
    const baseRegion = baseLines.lines.slice(start, end)
    const oursRegion = applyHunks(baseLines.lines, start, end, regionOurs)
    const theirsRegion = applyHunks(baseLines.lines, start, end, regionTheirs)

    if (regionTheirs.length === 0 || sameLines(oursRegion, theirsRegion)) {
      out.push(...oursRegion)
    } else if (regionOurs.length === 0) {
      out.push(...theirsRegion)
    } else {
      const markerStart = out.length
      out.push('<<<<<<< ours', ...oursRegion, '||||||| base', ...baseRegion, '=======', ...theirsRegion, '>>>>>>> theirs')
      conflicts.push({
        start: markerStart,
        end: out.length - 1,
        base: joinTerminated(baseRegion),
        ours: joinTerminated(oursRegion),
        theirs: joinTerminated(theirsRegion),
      })
    }
    pos = end
  }
  out.push(...baseLines.lines.slice(pos))

  const oursTrailing = ours.endsWith('\n')
  const theirsTrailing = theirs.endsWith('\n')
  const trailing = oursTrailing !== baseLines.trailing ? oursTrailing : theirsTrailing
  let merged = out.join('\n')
  if (merged.length > 0 && (trailing || out[out.length - 1]?.startsWith('>>>>>>>'))) merged += '\n'

  return {
    merged,
    hasConflicts: conflicts.length > 0,
    conflicts,
  }
}

/** A run of base lines `[start, end)` replaced by `lines` on one side. */
interface LineHunk {
  start: number
  end: number
  lines: string[]
}

function splitLines(text: string): { lines: string[]; trailing: boolean } {
  if (text === '') return { lines: [], trailing: false }
  const trailing = text.endsWith('\n')
  const lines = text.split('\n')
  if (trailing) lines.pop()
  return { lines, trailing }
}

function joinTerminated(lines: string[]): string {
  return lines.length === 0 ? '' : lines.join('\n') + '\n'
}

function sameLines(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((line, k) => line === b[k])
}

function touches(hunk: LineHunk, start: number, end: number): boolean {
  return hunk.start <= end && hunk.end >= start
}

/** The edit script of `side` against `base` as a list of disjoint, ordered hunks. */
function hunksAgainst(base: string[], side: string[]): LineHunk[] {
  const hunks: LineHunk[] = []
  let pos = 0
  let current: LineHunk | null = null

  for (const change of Diff.diffArrays(base, side)) {
    const values = change.value as string[]
    if (change.removed) {
      current ??= { start: pos, end: pos, lines: [] }
      current.end += values.length
      pos += values.length
    } else if (change.added) {
      current ??= { start: pos, end: pos, lines: [] }
      current.lines.push(...values)
    } else {
      if (current) hunks.push(current)
      current = null
      pos += values.length
    }
  }
  if (current) hunks.push(current)
  return hunks
}

/** The base lines `[start, end)` with one side's hunks (disjoint, ordered) applied. */
function applyHunks(base: string[], start: number, end: number, hunks: LineHunk[]): string[] {
  const out: string[] = []
  let pos = start
  for (const hunk of hunks) {
    out.push(...base.slice(pos, hunk.start), ...hunk.lines)
    pos = hunk.end
  }
  out.push(...base.slice(pos, end))
  return out
}

/**
 * Resolve a conflict by choosing a side.
 */
export function resolveConflict(
  content: string,
  resolution: 'ours' | 'theirs' | 'base'
): string {
  const conflictRegex = /<<<<<<< .*\n([\s\S]*?)(?:\|\|\|\|\|\|\| .*\n([\s\S]*?))?======= *\n([\s\S]*?)>>>>>>> .*\n/g

  return content.replace(conflictRegex, (_match, ours: string, base: string | undefined, theirs: string) => {
    switch (resolution) {
      case 'ours':
        return ours
      case 'theirs':
        return theirs
      case 'base':
        return base || ours
      default:
        return ours
    }
  })
}

// ============================================================================
// Structured (path-based) diff, apply and 3-way merge
// ============================================================================

/**
 * Diff two structured values by dotted leaf path — the diff `@mdxld/extract` reports after a
 * round trip. Nested objects are walked; arrays are leaves compared deeply (key order inside an
 * array's objects does not count as a change).
 *
 * @param paths - Restrict the removal check to these paths (default: every leaf of `original`)
 *
 * @example
 * ```ts
 * diffPaths({ data: { title: 'Hello' } }, { data: { title: 'Hi', tags: ['a'] } })
 * // { added: { data: { tags: ['a'] } }, modified: { 'data.title': { from: 'Hello', to: 'Hi' } }, removed: [], hasChanges: true }
 * ```
 */
export function diffPaths(
  original: Record<string, unknown>,
  extracted: Record<string, unknown>,
  paths?: string[]
): PathDiff {
  const added: Record<string, unknown> = {}
  const modified: Record<string, { from: unknown; to: unknown }> = {}
  const removed: string[] = []

  for (const path of leafPaths(extracted)) {
    const from = getPath(original, path)
    const to = getPath(extracted, path)
    if (from === undefined) {
      setPath(added, path, to)
    } else if (!deepEqual(from, to)) {
      modified[path] = { from, to }
    }
  }

  for (const path of paths ?? leafPaths(original)) {
    if (getPath(extracted, path) === undefined) {
      removed.push(path)
    }
  }

  return {
    added,
    modified,
    removed,
    hasChanges: Object.keys(added).length > 0 || Object.keys(modified).length > 0 || removed.length > 0,
  }
}

/**
 * Apply a structured value onto a copy of `original`, leaf path by leaf path. Paths absent from
 * `extracted` are left alone (a two-way overlay, not a replacement).
 *
 * @example
 * ```ts
 * applyPaths({ title: 'Hello', tags: ['a'] }, { tags: ['b'] }, { arrayMerge: 'append' })
 * // { title: 'Hello', tags: ['a', 'b'] }
 * ```
 */
export function applyPaths<T extends Record<string, unknown>>(
  original: T,
  extracted: Record<string, unknown>,
  options: ApplyPathsOptions = {}
): T {
  const result = clone(original)

  for (const path of leafPaths(extracted)) {
    if (options.paths && !options.paths.includes(path)) continue
    const value = getPath(extracted, path)
    const current = getPath(result, path)
    if (Array.isArray(current) && Array.isArray(value)) {
      switch (options.arrayMerge) {
        case 'append':
          setPath(result, path, [...current, ...value])
          break
        case 'prepend':
          setPath(result, path, [...value, ...current])
          break
        default:
          setPath(result, path, value)
      }
    } else {
      setPath(result, path, value)
    }
  }

  return result
}

/**
 * 3-way merge of structured values, leaf path by leaf path (like {@link merge3way} for objects).
 *
 * A path changed on one side only takes that side; changed identically on both takes it; changed
 * differently on both is a conflict. Two conflicting strings are first line-merged with
 * {@link merge3way} and only conflict when that does. Conflicts are resolved by `onConflict`
 * ('ours' by default) and reported, never dropped.
 *
 * @param base - The common ancestor (the props the markdown was rendered from)
 * @param ours - Our version (the props as they are now)
 * @param theirs - Their version (the props extracted from the edited markdown)
 *
 * @example
 * ```ts
 * const result = merge3wayObjects(
 *   { title: 'Hello', author: 'Jane' },
 *   { title: 'Hello', author: 'Jane Doe' },   // record edited
 *   { title: 'Hello, world', author: 'Jane' } // markdown edited
 * )
 * result.merged // { title: 'Hello, world', author: 'Jane Doe' }
 * ```
 */
export function merge3wayObjects<T extends Record<string, unknown>>(
  base: T,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  options: ObjectMergeOptions = {}
): ObjectMergeResult<T> {
  const { onConflict = 'ours', mergeText = true } = options
  const merged = clone(base)
  const conflicts: ObjectConflict[] = []
  const applied = { ours: [] as string[], theirs: [] as string[] }

  const paths = new Set<string>([...leafPaths(base), ...leafPaths(ours), ...leafPaths(theirs)])

  for (const path of paths) {
    const b = getPath(base, path)
    const o = getPath(ours, path)
    const t = getPath(theirs, path)
    const oursChanged = !deepEqual(b, o)
    const theirsChanged = !deepEqual(b, t)

    if (!oursChanged && !theirsChanged) continue

    let winner: unknown
    if (!theirsChanged) {
      winner = o
      applied.ours.push(path)
    } else if (!oursChanged) {
      winner = t
      applied.theirs.push(path)
    } else if (deepEqual(o, t)) {
      winner = o
      applied.ours.push(path)
      applied.theirs.push(path)
    } else {
      let resolved = false
      if (mergeText && typeof o === 'string' && typeof t === 'string' && (typeof b === 'string' || b === undefined)) {
        const text = merge3way(b ?? '', o, t)
        if (!text.hasConflicts) {
          winner = text.merged
          applied.ours.push(path)
          applied.theirs.push(path)
          resolved = true
        }
      }
      if (!resolved) {
        winner = onConflict === 'theirs' ? t : onConflict === 'base' ? b : o
        conflicts.push({ path, base: b, ours: o, theirs: t, resolution: onConflict })
      }
    }

    if (winner === undefined) deletePath(merged, path)
    else setPath(merged, path, winner)
  }

  return { merged, hasConflicts: conflicts.length > 0, conflicts, applied }
}

/** Dotted paths of every leaf (non-object value or array) in `obj`, in key order. */
function leafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(value)) {
      out.push(...leafPaths(value, path))
    } else {
      out.push(path)
    }
  }
  return out
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getPath(obj: unknown, path: string): unknown {
  let current: unknown = obj
  for (const part of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    if (!isPlainObject(current[key])) current[key] = {}
    current = current[key] as Record<string, unknown>
  }
  current[parts[parts.length - 1]!] = value
}

function deletePath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.')
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isPlainObject(current)) return
    current = current[parts[i]!]
  }
  if (isPlainObject(current)) delete current[parts[parts.length - 1]!]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert changes to a human-readable string with +/- prefixes.
 */
export function formatChanges(changes: Change[]): string {
  const lines: string[] = []

  for (const change of changes) {
    const prefix = change.added ? '+' : change.removed ? '-' : ' '
    const valueLines = change.value.split('\n')

    for (const line of valueLines) {
      if (line || valueLines.length === 1) {
        lines.push(`${prefix}${line}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Count additions and deletions in changes.
 */
export function countChanges(changes: Change[]): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0

  for (const change of changes) {
    if (change.added) {
      additions += change.count || change.value.split('\n').length
    } else if (change.removed) {
      deletions += change.count || change.value.split('\n').length
    }
  }

  return { additions, deletions }
}

/**
 * Check if two values are deeply equal (key order inside objects does not matter).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== 'object') return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }

  if (Array.isArray(a) || Array.isArray(b)) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
}

/**
 * Check if a patch can be applied cleanly.
 */
export function canApplyPatch(source: string, patch: string | ParsedPatch[]): boolean {
  const result = applyPatch(source, patch)
  return result !== false
}

/**
 * Get statistics from a patch.
 */
export function getPatchStats(patch: string | ParsedPatch[]): {
  files: number
  additions: number
  deletions: number
  hunks: number
} {
  const parsed = typeof patch === 'string' ? parsePatch(patch) : patch

  let additions = 0
  let deletions = 0
  let hunks = 0

  for (const file of parsed) {
    hunks += file.hunks.length
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++
        if (line.startsWith('-') && !line.startsWith('---')) deletions++
      }
    }
  }

  return {
    files: parsed.length,
    additions,
    deletions,
    hunks,
  }
}
