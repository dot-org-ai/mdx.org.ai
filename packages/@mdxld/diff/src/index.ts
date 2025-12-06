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
  merged: string
  hasConflicts: boolean
  conflicts: ConflictRegion[]
}

export interface ConflictRegion {
  start: number
  end: number
  base: string
  ours: string
  theirs: string
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
  // Diff.merge takes (mine, theirs, base) order and returns ParsedDiff
  const result = Diff.merge(ours, theirs, base)

  // Format the patch back into merged content
  const merged = Diff.formatPatch(result)

  // Check for conflict markers in the result
  const conflicts = parseConflicts(merged)

  return {
    merged,
    hasConflicts: conflicts.length > 0,
    conflicts,
  }
}

/**
 * Parse conflict markers from merged content.
 */
function parseConflicts(content: string): ConflictRegion[] {
  const conflicts: ConflictRegion[] = []
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line && line.startsWith('<<<<<<<')) {
      const start = i
      let base = ''
      let ours = ''
      let theirs = ''
      let section: 'ours' | 'base' | 'theirs' = 'ours'

      i++
      while (i < lines.length) {
        const currentLine = lines[i]
        if (!currentLine) {
          i++
          continue
        }

        if (currentLine.startsWith('|||||||')) {
          section = 'base'
        } else if (currentLine.startsWith('=======')) {
          section = 'theirs'
        } else if (currentLine.startsWith('>>>>>>>')) {
          conflicts.push({
            start,
            end: i,
            base,
            ours,
            theirs,
          })
          break
        } else {
          if (section === 'ours') ours += currentLine + '\n'
          else if (section === 'base') base += currentLine + '\n'
          else if (section === 'theirs') theirs += currentLine + '\n'
        }
        i++
      }
    }
    i++
  }

  return conflicts
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
 * Check if two values are deeply equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
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
