---
'mdxld': patch
---

Restore the `MDXLD` type export as a deprecated alias of `MDXLDDocument` (mdx-8je.20).

The published `ai-database` package (2.4.0, `dist/types.d.ts`) does `import type { MDXLD } from 'mdxld'` and declares `interface ThingExpanded extends MDXLD`, but no published `mdxld` since the `MDXLDDocument` rename exported that name; the break was only masked by `skipLibCheck`. `MDXLD<TData>` is structurally identical to `MDXLDDocument<TData>` and will be removed in the next major. Prefer `MDXLDDocument` in new code.
