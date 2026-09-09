# @mdxld/diff

Git-style diffing, patching, and 3-way merge for text and structured data.

## Installation

```bash
pnpm add @mdxld/diff
```

## Overview

```typescript
import {
  // Text diffing
  diffLines, diffWords, diffChars,
  // Git-style patches
  createPatch, applyPatch, parsePatch,
  // 3-way merge
  merge3way, resolveConflict,
  // Object diffing
  diffObjects, diffJSON, diffArrays,
  // Path-based diff, apply and 3-way merge of structured data
  diffPaths, applyPaths, merge3wayObjects,
} from '@mdxld/diff'
```

This is the one diff implementation in the mdx.org.ai repo: `@mdxld/extract` re-exports
`diffPaths` / `applyPaths` / `merge3wayObjects` as `diff` / `applyExtract` / `mergeExtract`,
and `@mdxld/markdown` ships no diff of its own.

## Text Diffing

### diffLines(oldStr, newStr)

Diff two strings line by line (most common for documents).

```typescript
const changes = diffLines(oldContent, newContent)

for (const change of changes) {
  if (change.added) {
    console.log('+', change.value)
  } else if (change.removed) {
    console.log('-', change.value)
  }
}
```

### diffWords(oldStr, newStr)

Diff word by word (useful for inline changes).

```typescript
const changes = diffWords('hello world', 'hello there')
// [{ value: 'hello ' }, { value: 'world', removed: true }, { value: 'there', added: true }]
```

### diffChars(oldStr, newStr)

Diff character by character (fine-grained).

```typescript
const changes = diffChars('hello', 'hallo')
// [{ value: 'h' }, { value: 'e', removed: true }, { value: 'a', added: true }, { value: 'llo' }]
```

### Options

```typescript
interface DiffOptions {
  ignoreWhitespace?: boolean  // Ignore leading/trailing whitespace
  ignoreCase?: boolean        // Case-insensitive comparison
  newlineIsToken?: boolean    // Treat newlines as tokens
}

const changes = diffLines(old, new, { ignoreWhitespace: true })
```

## Git-Style Patches

### createPatch(fileName, oldStr, newStr)

Create a unified diff patch (like `git diff`).

```typescript
const patch = createPatch('document.md', oldContent, newContent)
```

**Output:**

```diff
--- document.md
+++ document.md
@@ -1,4 +1,4 @@
 # Hello World

-This is the old content.
+This is the new content.

 More text here.
```

### Options

```typescript
interface PatchOptions {
  context?: number       // Context lines (default: 3)
  oldFileName?: string   // Original filename
  newFileName?: string   // New filename
  oldHeader?: string     // Header for old file
  newHeader?: string     // Header for new file
}

const patch = createPatch('doc.md', old, new, {
  context: 5,
  oldHeader: 'revision 1',
  newHeader: 'revision 2',
})
```

### applyPatch(source, patch)

Apply a patch to source content.

```typescript
const newContent = applyPatch(oldContent, patch)

if (newContent === false) {
  console.error('Patch failed to apply cleanly')
}
```

### parsePatch(patchString)

Parse a patch string into structured data.

```typescript
const patches = parsePatch(patchString)

for (const patch of patches) {
  console.log(`${patch.oldFileName} → ${patch.newFileName}`)
  console.log(`${patch.hunks.length} hunks`)
}
```

### structuredPatch(oldFile, newFile, oldStr, newStr)

Get structured patch data (programmatic access).

```typescript
const patch = structuredPatch('old.md', 'new.md', oldContent, newContent)

for (const hunk of patch.hunks) {
  console.log(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`)
  for (const line of hunk.lines) {
    console.log(line)
  }
}
```

### reversePatch(patch)

Swap additions and deletions (undo patch).

```typescript
const reversed = reversePatch(patches)
const restored = applyPatch(newContent, reversed)
```

## 3-Way Merge

### merge3way(base, ours, theirs)

Perform a 3-way merge like `git merge`.

```typescript
const base = `line 1
line 2
line 3`

const ours = `line 1
line 2 modified by us
line 3`

const theirs = `line 1
line 2
line 3 modified by them`

const result = merge3way(base, ours, theirs)

if (result.hasConflicts) {
  console.log('Conflicts found:', result.conflicts.length)
  console.log(result.merged) // Contains conflict markers
} else {
  console.log('Clean merge:', result.merged)
}
```

`merged` is the merged CONTENT (never a patch). Changes to different lines with an untouched
line between them merge cleanly; the same line changed differently on both sides, or two
changes that touch, become one region marked `<<<<<<< ours` / `||||||| base` / `=======` /
`>>>>>>> theirs`, and `conflicts` carries the base, ours and theirs text of each region.

### resolveConflict(content, resolution)

Resolve all conflicts by choosing a side.

```typescript
// Choose our changes for all conflicts
const resolved = resolveConflict(mergedWithConflicts, 'ours')

// Or choose their changes
const resolved = resolveConflict(mergedWithConflicts, 'theirs')

// Or use the base version
const resolved = resolveConflict(mergedWithConflicts, 'base')
```

## Object/JSON Diffing

### diffObjects(oldObj, newObj)

Diff two objects, returning structured changes.

```typescript
const diff = diffObjects(
  { name: 'John', age: 30, city: 'LA' },
  { name: 'John', age: 31, country: 'USA' }
)

console.log(diff)
// {
//   added: { country: 'USA' },
//   removed: { city: 'LA' },
//   modified: { age: { from: 30, to: 31 } },
//   unchanged: { name: 'John' },
//   hasChanges: true
// }
```

### diffJSON(oldObj, newObj)

Create a unified diff of JSON representations.

```typescript
const patch = diffJSON(oldConfig, newConfig, {
  oldFileName: 'config.old.json',
  newFileName: 'config.new.json',
})
```

### diffArrays(oldArr, newArr)

Diff two arrays.

```typescript
const diff = diffArrays(['a', 'b', 'c'], ['a', 'c', 'd'])
// {
//   added: [{ index: 2, value: 'd' }],
//   removed: [{ index: 1, value: 'b' }],
//   moved: [],
//   hasChanges: true
// }
```

## Structured Data: Path-Based Diff, Apply and 3-Way Merge

These walk nested objects by dotted leaf path (`data.title`); arrays are leaves compared deeply,
so a list of objects whose keys are merely reordered is not a change.

### diffPaths(original, extracted, paths?)

```typescript
diffPaths({ data: { title: 'Hello', author: 'Jane' } }, { data: { title: 'Hi', tags: ['a'] } })
// {
//   added: { data: { tags: ['a'] } },
//   modified: { 'data.title': { from: 'Hello', to: 'Hi' } },
//   removed: ['data.author'],
//   hasChanges: true
// }
```

### applyPaths(original, extracted, options?)

Overlay `extracted` onto a copy of `original`, leaf by leaf. Paths absent from `extracted` are
left alone. `options.paths` restricts which paths apply; `options.arrayMerge` is `'replace'`
(default), `'append'` or `'prepend'`.

```typescript
applyPaths({ title: 'Hello', tags: ['a'] }, { tags: ['b'] }, { arrayMerge: 'append' })
// { title: 'Hello', tags: ['a', 'b'] }
```

### merge3wayObjects(base, ours, theirs, options?)

`merge3way` for objects: a path changed on one side takes that side, changed identically on
both takes it, changed differently on both is a conflict. Two conflicting strings are first
line-merged with `merge3way`. Conflicts are resolved by `options.onConflict` (`'ours'` by
default, or `'theirs'` / `'base'`) and always reported.

```typescript
const result = merge3wayObjects(
  { title: 'Hello', author: 'Jane' },
  { title: 'Hello', author: 'Jane Doe' },   // ours: the record was edited
  { title: 'Hello, world', author: 'Jane' } // theirs: the markdown was edited
)
result.merged       // { title: 'Hello, world', author: 'Jane Doe' }
result.hasConflicts // false
result.applied      // { ours: ['author'], theirs: ['title'] }
```

## Utilities

### formatChanges(changes)

Convert changes to a human-readable string.

```typescript
const changes = diffLines(old, new)
console.log(formatChanges(changes))
// -old line
// +new line
```

### countChanges(changes)

Count additions and deletions.

```typescript
const { additions, deletions } = countChanges(changes)
console.log(`+${additions} -${deletions}`)
```

### canApplyPatch(source, patch)

Check if a patch can be applied cleanly.

```typescript
if (canApplyPatch(content, patch)) {
  const result = applyPatch(content, patch)
}
```

### getPatchStats(patch)

Get statistics from a patch.

```typescript
const stats = getPatchStats(patch)
// { files: 2, additions: 10, deletions: 5, hunks: 3 }
```

## Use Cases

### Version History for MDX Editor

```typescript
import { createPatch, applyPatch, parsePatch } from '@mdxld/diff'

class DocumentHistory {
  private patches: string[] = []
  private baseContent: string

  constructor(initialContent: string) {
    this.baseContent = initialContent
  }

  save(newContent: string, currentContent: string) {
    const patch = createPatch('document.mdx', currentContent, newContent)
    this.patches.push(patch)
  }

  getVersion(index: number): string {
    let content = this.baseContent
    for (let i = 0; i <= index && i < this.patches.length; i++) {
      const result = applyPatch(content, this.patches[i])
      if (result !== false) content = result
    }
    return content
  }

  getDiff(fromIndex: number, toIndex: number): string {
    const from = this.getVersion(fromIndex)
    const to = this.getVersion(toIndex)
    return createPatch('document.mdx', from, to)
  }
}
```

### Collaborative Editing Merge

```typescript
import { merge3way, resolveConflict } from '@mdxld/diff'

async function mergeEdits(base: string, userA: string, userB: string) {
  const result = merge3way(base, userA, userB)

  if (result.hasConflicts) {
    // Show conflicts to user for manual resolution
    // Or auto-resolve with a strategy
    return resolveConflict(result.merged, 'theirs')
  }

  return result.merged
}
```

### Config File Diffing

```typescript
import { diffObjects, diffJSON } from '@mdxld/diff'

function compareConfigs(oldConfig: object, newConfig: object) {
  // Structured diff for programmatic use
  const structured = diffObjects(oldConfig, newConfig)

  if (structured.hasChanges) {
    console.log('Added keys:', Object.keys(structured.added))
    console.log('Removed keys:', Object.keys(structured.removed))
    console.log('Modified keys:', Object.keys(structured.modified))
  }

  // Unified diff for display
  const unified = diffJSON(oldConfig, newConfig)
  console.log(unified)
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/markdown`](../markdown) | Markdown ↔ Object conversion |
| [`@mdxld/extract`](../extract) | Template-based extraction |
| [`@mdxld/json`](../json) | JSON format conversions |

## License

MIT
