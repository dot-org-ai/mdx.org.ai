---
'@mdxld/diff': minor
'@mdxld/extract': minor
'@mdxld/markdown': minor
'@mdxld/formats': minor
---

One diff implementation in the repo (mdx-8je.12).

- `@mdxld/diff`: `merge3way` now returns merged CONTENT with git-style conflict regions
  (it returned a unified patch and printed `[object Object]` for conflicts); new
  path-based `diffPaths`, `applyPaths`, `merge3wayObjects` and exported `deepEqual`.
- `@mdxld/extract`: `diff` / `applyExtract` delegate to `@mdxld/diff` (key order inside a
  list's objects is no longer a change); new 3-way `mergeExtract`; `extractWithAI` is
  implemented over `ai-functions` `generateObject` (optional peer) with an injectable
  `generate`; loop / conditional slots are captured as regions instead of breaking the
  match for the scalars beside them; slot parsing is brace-balanced; entity tables go
  through `@mdxld/markdown`; render → extract identity is proved against the npm
  `@mdxui/text` md register for every Role fixture.
- `@mdxld/markdown`: `diff` / `applyExtract` / `DiffResult` removed (use `@mdxld/extract`
  or `@mdxld/diff`); new `parseTable` / `renderTable` shared with `@mdxld/extract`;
  `fromMarkdown` keeps empty table cells positional.
- `@mdxld/formats`: re-exports `parseTable` / `renderTable` instead of the removed
  `diff` / `applyExtract` / `DiffResult`.
