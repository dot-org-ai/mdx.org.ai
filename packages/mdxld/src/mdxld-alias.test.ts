/**
 * Guards the deprecated `MDXLD` type alias.
 *
 * The published `ai-database` package does `import type { MDXLD } from 'mdxld'`
 * and declares `interface ThingExpanded extends MDXLD`. Dropping the alias
 * silently breaks every consumer of ai-database's types, so this file must
 * keep compiling under `tsc --noEmit` (the mdxld tsconfig includes `src`).
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import type { MDXLD, MDXLDDocument, TypedData } from './index.js'
import { parse } from './parse.js'

// Mirrors ai-database's usage: an interface may extend the alias.
interface ThingLike extends MDXLD {
  extra?: string
}

describe('MDXLD alias', () => {
  it('is structurally identical to MDXLDDocument', () => {
    expectTypeOf<MDXLD>().toEqualTypeOf<MDXLDDocument>()
    expectTypeOf<MDXLD<TypedData<'Article'>>>().toEqualTypeOf<MDXLDDocument<TypedData<'Article'>>>()
  })

  it('accepts a parsed document and can be extended by an interface', () => {
    const doc: MDXLD = parse('---\n$type: Article\ntitle: Hello\n---\n\nBody')
    const thing: ThingLike = { ...doc, extra: 'x' }

    expect(doc.type).toBe('Article')
    expect(thing.data.title).toBe('Hello')
    expect(thing.content.trim()).toBe('Body')
  })
})
