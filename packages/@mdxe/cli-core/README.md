# @mdxe/cli-core

The resolvers `mdxe`'s faces share. The CLI (`mdxe`) and the HTTP faces (`@mdxe/hono`) resolve their
output format from **one** ladder and stamp token costs from **one** labelled oracle. `mdxe` depends
on `@mdxe/hono`, so these modules cannot live in `mdxe` without a dependency cycle — they live here,
a leaf package with no runtime dependencies that both packages depend on.

## Installation

```bash
pnpm add @mdxe/cli-core
```

## Modules

| Import | What it decides |
|--------|-----------------|
| `@mdxe/cli-core/context` | `resolveOutputCtx(flags, env, streams)` — the frozen `OutputCtx` (`mode`, `color`, `width`, `interactive`, `stream`). Precedence for mode: `--json`/`--format` > `Accept` > `--agent`/agent env > CI > piped > TTY. `modeFromAccept(accept)` is the `Accept` rung on its own, for an HTTP face. |
| `@mdxe/cli-core/caller` | `resolveCaller(flags, env, streams)` — who is invoking (`agent` / `human`), how it was detected, and whether an interactive surface is allowed (a confident human only; env beats TTY). |
| `@mdxe/cli-core/errors` | `CliError` with a stable `code`, the `EXIT` map (`USAGE`=2, `NOT_FOUND`=3, `RUNTIME_UNAVAILABLE`=4, `PAYMENT_REQUIRED`=5, `REFUSED`=6, `SIGINT`=130), and `fail(ctx, err)` which renders to stderr only. |
| `@mdxe/cli-core/tokens` | `countTokens(text, tokenizer)` — every count is labelled with the `CountMethod` that produced it (`tiktoken-*` via the optional, lazily imported `js-tiktoken`; `chars-approx`; or the offline `fable-native` cache, which fails closed on a miss). |

The root export re-exports all four.

## Usage

### CLI

```typescript
import { resolveFromProcess, resolveCallerFromProcess, fail } from '@mdxe/cli-core'

const ctx = resolveFromProcess({ json: false })
const caller = resolveCallerFromProcess({})
try {
  // ...dispatch, writing the payload to stdout only
} catch (err) {
  process.exitCode = fail(ctx, err) // stderr only; returns the stable exit code
}
```

### HTTP face (the same ladder, `Accept` flavour)

```typescript
import { modeFromAccept } from '@mdxe/cli-core/context'
import { countTokens } from '@mdxe/cli-core/tokens'

const mode = modeFromAccept(request.headers.get('accept') ?? undefined)
// 'json' | 'text' | 'human' | null — null means "nothing this ladder renders"; the face decides
// whether that is a 406 (never a silent downgrade).

const { count, method } = await countTokens(markdown, 'cl100k_base')
headers.set('x-markdown-tokens', String(count)) // `method` says how the number was produced
```

## Standing constraints

- **Leaf**: every module statically imports only its siblings; `node:fs` / `node:crypto` / `js-tiktoken` are reached through lazy `await import(...)`. Pinned by `tests/leaf.test.ts`.
- **Pure**: the resolvers read their `flags` / `env` / `streams` arguments, never `process`, except the thin `*FromProcess` wrappers.
- **Fail closed**: under any ambiguity the caller is non-interactive; a bad `--format` is `USAGE`; the native token cache throws on a miss rather than fabricate a count.

Ported from kestrel (`kestrel.markets`, MIT, (c) 2026 Nathan Clevenger) by mdx-8je.16; lifted into this leaf by mdx-8je.26.
