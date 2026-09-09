---
'@mdxe/cli-core': minor
'mdxe': patch
'@mdxe/hono': patch
---

Add `@mdxe/cli-core`, the leaf home of the resolvers mdxe's faces share (mdx-8je.26).

`mdxe` depends on `@mdxe/hono`, so the HTTP faces could not import the `--format` ladder's `Accept` rung (`modeFromAccept`) or the labelled token-count oracle from `mdxe` without a dependency cycle. `src/cli/{context,caller,errors,tokens}.ts` move out of `mdxe` into `@mdxe/cli-core` (no runtime dependencies; node built-ins reached only through lazy imports), which both `mdxe` and `@mdxe/hono` now depend on. `mdxe` keeps re-exporting `OutputCtx`, `RenderMode`, `GlobalFlags`, `Caller`, `CliError` and `EXIT` from its `cli` entry, so no consumer import changes.
