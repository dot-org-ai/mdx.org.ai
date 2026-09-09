import { describe, it, expect } from 'vitest'
import {
  diffChars,
  diffWords,
  diffLines,
  diffTrimmedLines,
  diffSentences,
  createPatch,
  createTwoFilesPatch,
  parsePatch,
  applyPatch,
  reversePatch,
  structuredPatch,
  diffObjects,
  diffJSON,
  diffArrays,
  merge3way,
  resolveConflict,
  diffPaths,
  applyPaths,
  merge3wayObjects,
  formatChanges,
  countChanges,
  canApplyPatch,
  getPatchStats,
} from './index.js'

// =============================================================================
// Text Diffing Tests
// =============================================================================

describe('diffChars', () => {
  it('should diff character by character', () => {
    const changes = diffChars('hello', 'hallo')

    expect(changes).toHaveLength(4)
    expect(changes[0]!.value).toBe('h')
    expect(changes[0]!.count).toBe(1)
    expect(changes[1]).toMatchObject({ value: 'e', removed: true })
    expect(changes[2]).toMatchObject({ value: 'a', added: true })
    expect(changes[3]!.value).toBe('llo')
  })

  it('should return single change for identical strings', () => {
    const changes = diffChars('hello', 'hello')
    expect(changes).toHaveLength(1)
    expect(changes[0]!.value).toBe('hello')
    // The diff library returns explicit false for added/removed on unchanged parts
    expect(changes[0]!.added).toBeFalsy()
    expect(changes[0]!.removed).toBeFalsy()
  })

  it('should handle empty strings', () => {
    const changes = diffChars('', 'hello')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ value: 'hello', added: true })
  })

  it('should handle case insensitive option', () => {
    const changes = diffChars('Hello', 'hello', { ignoreCase: true })
    expect(changes).toHaveLength(1)
    // With ignoreCase, they are the same so added/removed are falsy
    expect(changes[0]!.added).toBeFalsy()
    expect(changes[0]!.removed).toBeFalsy()
  })
})

describe('diffWords', () => {
  it('should diff word by word', () => {
    const changes = diffWords('hello world', 'hello there')

    expect(changes.some((c) => c.value.includes('world') && c.removed)).toBe(true)
    expect(changes.some((c) => c.value.includes('there') && c.added)).toBe(true)
  })

  it('should handle added words', () => {
    const changes = diffWords('hello', 'hello world')
    expect(changes.some((c) => c.value.includes('world') && c.added)).toBe(true)
  })

  it('should handle removed words', () => {
    const changes = diffWords('hello world', 'hello')
    expect(changes.some((c) => c.value.includes('world') && c.removed)).toBe(true)
  })

  it('should handle empty strings', () => {
    const changes = diffWords('', 'hello')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ value: 'hello', added: true })
  })
})

describe('diffLines', () => {
  it('should diff line by line', () => {
    const changes = diffLines('line1\nline2', 'line1\nline3')

    expect(changes.some((c) => c.value.includes('line2') && c.removed)).toBe(true)
    expect(changes.some((c) => c.value.includes('line3') && c.added)).toBe(true)
  })

  it('should handle added lines', () => {
    const changes = diffLines('line1', 'line1\nline2')
    expect(changes.some((c) => c.value.includes('line2') && c.added)).toBe(true)
  })

  it('should handle removed lines', () => {
    const changes = diffLines('line1\nline2', 'line1')
    expect(changes.some((c) => c.value.includes('line2') && c.removed)).toBe(true)
  })

  it('should handle whitespace option', () => {
    const changes = diffLines('  line1  ', 'line1', { ignoreWhitespace: true })
    // With ignore whitespace, these might be considered equal
    expect(changes.length).toBeGreaterThanOrEqual(1)
  })
})

describe('diffTrimmedLines', () => {
  it('should ignore leading/trailing whitespace', () => {
    const changes = diffTrimmedLines('  hello  ', 'hello')
    expect(changes).toHaveLength(1)
    // The diff library returns explicit false for added/removed on unchanged parts
    expect(changes[0]!.added).toBeFalsy()
    expect(changes[0]!.removed).toBeFalsy()
  })
})

describe('diffSentences', () => {
  it('should diff sentence by sentence', () => {
    const changes = diffSentences(
      'Hello world. Goodbye world.',
      'Hello world. Hello again.'
    )
    expect(changes.length).toBeGreaterThan(1)
  })
})

// =============================================================================
// Patch Tests
// =============================================================================

describe('createPatch', () => {
  it('should create unified diff format', () => {
    const patch = createPatch('file.txt', 'hello', 'world')

    expect(patch).toContain('--- file.txt')
    expect(patch).toContain('+++ file.txt')
    expect(patch).toContain('-hello')
    expect(patch).toContain('+world')
  })

  it('should use custom filenames', () => {
    const patch = createPatch('test.txt', 'a', 'b', {
      oldFileName: 'old.txt',
      newFileName: 'new.txt',
    })

    expect(patch).toContain('--- old.txt')
    expect(patch).toContain('+++ new.txt')
  })

  it('should include custom headers', () => {
    const patch = createPatch('file.txt', 'a', 'b', {
      oldHeader: 'revision 1',
      newHeader: 'revision 2',
    })

    expect(patch).toContain('revision 1')
    expect(patch).toContain('revision 2')
  })

  it('should respect context option', () => {
    const content = 'line1\nline2\nline3\nline4\nline5\nline6\nline7'
    const newContent = 'line1\nline2\nCHANGED\nline4\nline5\nline6\nline7'

    const patch3 = createPatch('file.txt', content, newContent, { context: 3 })
    const patch1 = createPatch('file.txt', content, newContent, { context: 1 })

    expect(patch3.length).toBeGreaterThan(patch1.length)
  })
})

describe('createTwoFilesPatch', () => {
  it('should create patch between two files', () => {
    const patch = createTwoFilesPatch('old.txt', 'new.txt', 'old', 'new')

    expect(patch).toContain('--- old.txt')
    expect(patch).toContain('+++ new.txt')
    expect(patch).toContain('-old')
    expect(patch).toContain('+new')
  })
})

describe('parsePatch', () => {
  it('should parse unified diff', () => {
    const patch = createPatch('file.txt', 'old', 'new')
    const parsed = parsePatch(patch)

    expect(parsed).toHaveLength(1)
    expect(parsed[0]!.hunks).toHaveLength(1)
    expect(parsed[0]!.hunks[0]!.lines).toContain('-old')
    expect(parsed[0]!.hunks[0]!.lines).toContain('+new')
  })

  it('should parse multi-file patch', () => {
    const patch1 = createPatch('file1.txt', 'a', 'b')
    const patch2 = createPatch('file2.txt', 'c', 'd')
    const combined = patch1 + '\n' + patch2

    const parsed = parsePatch(combined)
    expect(parsed).toHaveLength(2)
  })
})

describe('applyPatch', () => {
  it('should apply patch to source', () => {
    const patch = createPatch('file.txt', 'hello', 'world')
    const result = applyPatch('hello', patch)

    expect(result).toBe('world')
  })

  it('should return false for non-matching patch', () => {
    const patch = createPatch('file.txt', 'hello', 'world')
    const result = applyPatch('different content', patch)

    expect(result).toBe(false)
  })

  it('should handle fuzz factor', () => {
    const patch = createPatch('file.txt', 'line1\nline2', 'line1\nchanged')
    // With slight variation, fuzz might help
    const result = applyPatch('line1\nline2', patch, { fuzzFactor: 0 })

    expect(result).not.toBe(false)
  })

  it('should round-trip with createPatch', () => {
    const original = 'line1\nline2\nline3'
    const modified = 'line1\nchanged\nline3'

    const patch = createPatch('file.txt', original, modified)
    const result = applyPatch(original, patch)

    expect(result).toBe(modified)
  })
})

describe('reversePatch', () => {
  it('should create reverse patch', () => {
    const patch = createPatch('file.txt', 'old', 'new')
    const parsed = parsePatch(patch)
    const reversed = reversePatch(parsed[0]!)

    // Apply original, then the reversed patch gives the original back
    const afterForward = applyPatch('old', patch)
    expect(afterForward).toBe('new')
    expect(applyPatch('new', reversed)).toBe('old')
  })
})

describe('structuredPatch', () => {
  it('should return structured patch data', () => {
    const patch = structuredPatch('old.txt', 'new.txt', 'hello', 'world')

    expect(patch.oldFileName).toBe('old.txt')
    expect(patch.newFileName).toBe('new.txt')
    expect(patch.hunks).toHaveLength(1)
    expect(patch.hunks[0]!.oldStart).toBeDefined()
    expect(patch.hunks[0]!.newStart).toBeDefined()
  })
})

// =============================================================================
// Object Diffing Tests
// =============================================================================

describe('diffObjects', () => {
  it('should detect added properties', () => {
    const diff = diffObjects({ a: 1 }, { a: 1, b: 2 })

    expect(diff.added).toEqual({ b: 2 })
    expect(diff.hasChanges).toBe(true)
  })

  it('should detect removed properties', () => {
    const diff = diffObjects({ a: 1, b: 2 }, { a: 1 })

    expect(diff.removed).toEqual({ b: 2 })
    expect(diff.hasChanges).toBe(true)
  })

  it('should detect modified properties', () => {
    const diff = diffObjects({ a: 1 }, { a: 2 })

    expect(diff.modified).toEqual({ a: { from: 1, to: 2 } })
    expect(diff.hasChanges).toBe(true)
  })

  it('should detect unchanged properties', () => {
    const diff = diffObjects({ a: 1, b: 2 }, { a: 1, b: 3 })

    expect(diff.unchanged).toEqual({ a: 1 })
  })

  it('should detect no changes', () => {
    const diff = diffObjects({ a: 1 }, { a: 1 })

    expect(diff.hasChanges).toBe(false)
    expect(diff.added).toEqual({})
    expect(diff.removed).toEqual({})
    expect(diff.modified).toEqual({})
  })

  it('should handle nested objects', () => {
    const diff = diffObjects(
      { nested: { value: 1 } },
      { nested: { value: 2 } }
    )

    expect(diff.modified.nested).toBeDefined()
  })

  it('should handle arrays', () => {
    const diff = diffObjects(
      { items: [1, 2] },
      { items: [1, 2, 3] }
    )

    expect(diff.modified.items).toBeDefined()
  })

  it('should handle empty objects', () => {
    const diff = diffObjects({}, {})
    expect(diff.hasChanges).toBe(false)
  })
})

describe('diffJSON', () => {
  it('should create unified diff of JSON', () => {
    const patch = diffJSON({ name: 'old' }, { name: 'new' })

    expect(patch).toContain('-')
    expect(patch).toContain('+')
    expect(patch).toContain('old')
    expect(patch).toContain('new')
  })

  it('should use custom filenames', () => {
    const patch = diffJSON({ a: 1 }, { a: 2 }, { oldFileName: 'before.json' })
    expect(patch).toContain('before.json')
  })
})

describe('diffArrays', () => {
  it('should detect added items', () => {
    const diff = diffArrays(['a', 'b'], ['a', 'b', 'c'])

    expect(diff.added).toContainEqual({ index: 2, value: 'c' })
    expect(diff.hasChanges).toBe(true)
  })

  it('should detect removed items', () => {
    const diff = diffArrays(['a', 'b', 'c'], ['a', 'c'])

    expect(diff.removed).toContainEqual({ index: 1, value: 'b' })
    expect(diff.hasChanges).toBe(true)
  })

  it('should detect no changes', () => {
    const diff = diffArrays(['a', 'b'], ['a', 'b'])

    expect(diff.hasChanges).toBe(false)
    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it('should handle empty arrays', () => {
    const diff = diffArrays([], [])
    expect(diff.hasChanges).toBe(false)
  })

  it('should handle object items', () => {
    const diff = diffArrays(
      [{ id: 1 }],
      [{ id: 1 }, { id: 2 }]
    )

    expect(diff.hasChanges).toBe(true)
  })
})

// =============================================================================
// 3-Way Merge Tests
// =============================================================================

describe('merge3way', () => {
  it('merges changes to different lines with an untouched line between them', () => {
    const base = 'line1\nline2\nline3\nline4\n'
    const ours = 'line1\nmodified by us\nline3\nline4\n'
    const theirs = 'line1\nline2\nline3\nmodified by them\n'

    const result = merge3way(base, ours, theirs)

    expect(result.hasConflicts).toBe(false)
    expect(result.conflicts).toEqual([])
    expect(result.merged).toBe('line1\nmodified by us\nline3\nmodified by them\n')
  })

  it('returns merged CONTENT, never a unified patch', () => {
    const result = merge3way('a\nb\n', 'a\nB\n', 'a\nb\nc\n')
    expect(result.merged).not.toMatch(/^Index:|^@@|^---|^\+\+\+/m)
  })

  it('takes our side when theirs is unchanged and vice versa', () => {
    expect(merge3way('a\nb\n', 'a\nB\n', 'a\nb\n').merged).toBe('a\nB\n')
    expect(merge3way('a\nb\n', 'a\nb\n', 'a\nB\n').merged).toBe('a\nB\n')
  })

  it('handles insertions and deletions on either side', () => {
    expect(merge3way('a\nb\nc\n', 'x\na\nb\nc\n', 'a\nb\nc\nz\n').merged).toBe('x\na\nb\nc\nz\n')
    expect(merge3way('a\nb\nc\nd\ne\n', 'b\nc\nd\ne\n', 'a\nb\nc\nd\n').merged).toBe('b\nc\nd\n')
  })

  it('marks the same line changed differently as a conflict with base, ours and theirs', () => {
    const base = 'line1\nline2\nline3\n'
    const ours = 'line1\nour change\nline3\n'
    const theirs = 'line1\ntheir change\nline3\n'

    const result = merge3way(base, ours, theirs)

    expect(result.hasConflicts).toBe(true)
    expect(result.conflicts).toEqual([
      { start: 1, end: 7, base: 'line2\n', ours: 'our change\n', theirs: 'their change\n' },
    ])
    expect(result.merged).toBe(
      'line1\n<<<<<<< ours\nour change\n||||||| base\nline2\n=======\ntheir change\n>>>>>>> theirs\nline3\n'
    )
    expect(resolveConflict(result.merged, 'ours')).toBe(ours)
    expect(resolveConflict(result.merged, 'theirs')).toBe(theirs)
    expect(resolveConflict(result.merged, 'base')).toBe(base)
  })

  it('treats adjacent changes (no untouched line between) as one conflicting region, like git', () => {
    const result = merge3way('a\nb\nc\n', 'a\nB\nc\n', 'a\nb\nC\n')
    expect(result.hasConflicts).toBe(true)
    expect(result.conflicts[0]).toMatchObject({ base: 'b\nc\n', ours: 'B\nc\n', theirs: 'b\nC\n' })
  })

  it('accepts identical changes on both sides without a conflict', () => {
    const result = merge3way('original', 'same change', 'same change')
    expect(result.hasConflicts).toBe(false)
    expect(result.merged).toBe('same change')
  })

  it('preserves the absence of a trailing newline', () => {
    expect(merge3way('a\nb', 'a\nB', 'a\nb').merged).toBe('a\nB')
  })

  it('always terminates a closing conflict marker with a newline so resolveConflict can find it', () => {
    const result = merge3way('a', 'b', 'c')
    expect(result.merged.endsWith('>>>>>>> theirs\n')).toBe(true)
    expect(resolveConflict(result.merged, 'theirs')).toBe('c\n')
  })

  it('merges empty base (both sides added different content) as a conflict', () => {
    const result = merge3way('', 'ours\n', 'theirs\n')
    expect(result.hasConflicts).toBe(true)
    expect(result.conflicts[0]).toMatchObject({ base: '', ours: 'ours\n', theirs: 'theirs\n' })
  })
})

describe('diffPaths', () => {
  it('reports added, modified and removed leaf paths', () => {
    const result = diffPaths(
      { data: { title: 'Hello', author: 'Jane' }, draft: true },
      { data: { title: 'Hi', tags: ['a'] }, draft: true }
    )
    expect(result).toEqual({
      added: { data: { tags: ['a'] } },
      modified: { 'data.title': { from: 'Hello', to: 'Hi' } },
      removed: ['data.author'],
      hasChanges: true,
    })
  })

  it('reports no changes for deep-equal values', () => {
    const result = diffPaths({ a: { b: [1, { c: 2 }] } }, { a: { b: [1, { c: 2 }] } })
    expect(result.hasChanges).toBe(false)
  })

  it('does not report a list of objects whose keys are merely reordered (mdx-8je.12 gap)', () => {
    const original = { items: [{ title: 'A', description: 'a' }] }
    const reordered = { items: [{ description: 'a', title: 'A' }] }
    expect(diffPaths(original, reordered).hasChanges).toBe(false)
  })

  it('restricts the removal check to the given paths', () => {
    const result = diffPaths({ a: 1, b: 2 }, {}, ['a'])
    expect(result.removed).toEqual(['a'])
  })
})

describe('applyPaths', () => {
  it('overlays leaf paths without touching the rest', () => {
    expect(applyPaths({ data: { title: 'Hello', author: 'Jane' } }, { data: { title: 'Hi' } })).toEqual({
      data: { title: 'Hi', author: 'Jane' },
    })
  })

  it('creates missing nesting', () => {
    expect(applyPaths({ a: 1 }, { meta: { x: 'y' } })).toEqual({ a: 1, meta: { x: 'y' } })
  })

  it('honours paths and arrayMerge', () => {
    const original = { title: 'T', tags: ['a', 'b'] }
    expect(applyPaths(original, { title: 'U', tags: ['c'] }, { paths: ['tags'] })).toEqual({ title: 'T', tags: ['c'] })
    expect(applyPaths(original, { tags: ['c'] }, { arrayMerge: 'append' })).toEqual({ title: 'T', tags: ['a', 'b', 'c'] })
    expect(applyPaths(original, { tags: ['c'] }, { arrayMerge: 'prepend' })).toEqual({ title: 'T', tags: ['c', 'a', 'b'] })
  })

  it('does not mutate the original', () => {
    const original = { data: { title: 'Hello' } }
    applyPaths(original, { data: { title: 'Hi' } })
    expect(original.data.title).toBe('Hello')
  })
})

describe('merge3wayObjects', () => {
  const base = { data: { title: 'Hello', author: 'Jane', body: 'one\ntwo\nthree' } }

  it('takes each side where only that side changed', () => {
    const ours = { data: { title: 'Hello', author: 'Jane Doe', body: base.data.body } }
    const theirs = { data: { title: 'Hello, world', author: 'Jane', body: base.data.body } }

    const result = merge3wayObjects(base, ours, theirs)

    expect(result.hasConflicts).toBe(false)
    expect(result.merged).toEqual({ data: { title: 'Hello, world', author: 'Jane Doe', body: base.data.body } })
    expect(result.applied).toEqual({ ours: ['data.author'], theirs: ['data.title'] })
  })

  it('accepts identical changes on both sides', () => {
    const both = { data: { ...base.data, title: 'Same' } }
    const result = merge3wayObjects(base, both, both)
    expect(result.hasConflicts).toBe(false)
    expect(result.merged.data.title).toBe('Same')
  })

  it('line-merges a string both sides changed in different places', () => {
    const ours = { data: { ...base.data, body: 'ONE\ntwo\nthree' } }
    const theirs = { data: { ...base.data, body: 'one\ntwo\nTHREE' } }
    const result = merge3wayObjects(base, ours, theirs)
    expect(result.hasConflicts).toBe(false)
    expect(result.merged.data.body).toBe('ONE\ntwo\nTHREE')
  })

  it('reports a conflict and keeps ours by default when both sides changed a value differently', () => {
    const ours = { data: { ...base.data, title: 'Ours' } }
    const theirs = { data: { ...base.data, title: 'Theirs' } }

    const result = merge3wayObjects(base, ours, theirs)

    expect(result.hasConflicts).toBe(true)
    expect(result.conflicts).toEqual([{ path: 'data.title', base: 'Hello', ours: 'Ours', theirs: 'Theirs', resolution: 'ours' }])
    expect(result.merged.data.title).toBe('Ours')
    expect(merge3wayObjects(base, ours, theirs, { onConflict: 'theirs' }).merged.data.title).toBe('Theirs')
    expect(merge3wayObjects(base, ours, theirs, { onConflict: 'base' }).merged.data.title).toBe('Hello')
  })

  it('carries a deletion from one side and an addition from the other', () => {
    const ours = { data: { title: 'Hello', body: base.data.body } }
    const theirs = { data: { ...base.data, tags: ['x'] } }
    const result = merge3wayObjects(base, ours, theirs)
    expect(result.merged).toEqual({ data: { title: 'Hello', body: base.data.body, tags: ['x'] } })
  })

  it('conflicts when one side deleted and the other changed the same path', () => {
    const ours = { data: { title: 'Hello', body: base.data.body } }
    const theirs = { data: { ...base.data, author: 'J. Doe' } }
    const result = merge3wayObjects(base, ours, theirs, { onConflict: 'theirs' })
    expect(result.conflicts).toEqual([{ path: 'data.author', base: 'Jane', ours: undefined, theirs: 'J. Doe', resolution: 'theirs' }])
    expect(result.merged.data.author).toBe('J. Doe')
  })

  it('does not mutate any input', () => {
    const ours = { data: { ...base.data, author: 'X' } }
    merge3wayObjects(base, ours, base)
    expect(base.data.author).toBe('Jane')
  })
})

describe('resolveConflict', () => {
  it('should resolve with ours', () => {
    const content = '<<<<<<< ours\nour content\n=======\ntheir content\n>>>>>>> theirs\n'
    const result = resolveConflict(content, 'ours')

    expect(result).toContain('our content')
    expect(result).not.toContain('<<<<<<')
    expect(result).not.toContain('>>>>>>>')
  })

  it('should resolve with theirs', () => {
    const content = '<<<<<<< ours\nour content\n=======\ntheir content\n>>>>>>> theirs\n'
    const result = resolveConflict(content, 'theirs')

    expect(result).toContain('their content')
    expect(result).not.toContain('our content')
  })

  it('should handle multiple conflicts', () => {
    const content = `
<<<<<<< ours
first ours
=======
first theirs
>>>>>>> theirs
middle
<<<<<<< ours
second ours
=======
second theirs
>>>>>>> theirs
`
    const result = resolveConflict(content, 'ours')

    expect(result).toContain('first ours')
    expect(result).toContain('second ours')
    expect(result).not.toContain('first theirs')
  })
})

// =============================================================================
// Utility Tests
// =============================================================================

describe('formatChanges', () => {
  it('should format changes with +/- prefixes', () => {
    const changes = diffLines('old', 'new')
    const formatted = formatChanges(changes)

    expect(formatted).toContain('-')
    expect(formatted).toContain('+')
  })

  it('should handle unchanged content', () => {
    const changes = diffLines('same', 'same')
    const formatted = formatChanges(changes)

    expect(formatted).toContain(' same')
  })
})

describe('countChanges', () => {
  it('should count additions and deletions', () => {
    const changes = diffLines('line1\nline2', 'line1\nline3')
    const counts = countChanges(changes)

    expect(counts.additions).toBeGreaterThan(0)
    expect(counts.deletions).toBeGreaterThan(0)
  })

  it('should return zero for no changes', () => {
    const changes = diffLines('same', 'same')
    const counts = countChanges(changes)

    expect(counts.additions).toBe(0)
    expect(counts.deletions).toBe(0)
  })
})

describe('canApplyPatch', () => {
  it('should return true for valid patch', () => {
    const patch = createPatch('file.txt', 'hello', 'world')
    expect(canApplyPatch('hello', patch)).toBe(true)
  })

  it('should return false for invalid patch', () => {
    const patch = createPatch('file.txt', 'hello', 'world')
    expect(canApplyPatch('different', patch)).toBe(false)
  })
})

describe('getPatchStats', () => {
  it('should return patch statistics', () => {
    const patch = createPatch('file.txt', 'line1\nline2', 'line1\nline3\nline4')
    const stats = getPatchStats(patch)

    expect(stats.files).toBe(1)
    expect(stats.additions).toBeGreaterThan(0)
    expect(stats.hunks).toBeGreaterThan(0)
  })

  it('should handle multi-file patches', () => {
    const patch1 = createPatch('file1.txt', 'a', 'b')
    const patch2 = createPatch('file2.txt', 'c', 'd')
    const stats = getPatchStats(patch1 + '\n' + patch2)

    expect(stats.files).toBe(2)
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('should handle unicode in diffs', () => {
    const changes = diffChars('hello 🌍', 'hello 🎉')
    expect(changes.some((c) => c.value.includes('🌍') && c.removed)).toBe(true)
    expect(changes.some((c) => c.value.includes('🎉') && c.added)).toBe(true)
  })

  it('should handle very long strings', () => {
    const longStr = 'x'.repeat(10000)
    const changes = diffChars(longStr, longStr + 'y')
    expect(changes.some((c) => c.value === 'y' && c.added)).toBe(true)
  })

  it('should handle special characters', () => {
    const changes = diffLines('line with "quotes"', "line with 'quotes'")
    expect(changes.length).toBeGreaterThan(0)
  })

  it('should handle Windows line endings', () => {
    const changes = diffLines('line1\r\nline2', 'line1\r\nline3')
    expect(changes.length).toBeGreaterThan(0)
  })

  it('should handle mixed line endings', () => {
    const changes = diffLines('line1\nline2', 'line1\r\nline2')
    // Line endings might cause differences
    expect(changes).toBeDefined()
  })
})
