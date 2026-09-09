---
'mdxe': major
'@mdxe/deploy': major
'@mdxe/cloudflare': major
'@mdxai/claude': minor
---

Prune the non-Cloudflare runtime packages (mdx-8je.7). mdx.org.ai is Cloudflare-native only: arbitrary code executes through Dynamic Worker Loaders (workerd) in production and under Miniflare locally; the Node and Bun CLIs are thin shells that boot workerd, never evaluation runtimes.

Removed from the workspace and deprecated on npm (history stays in git):

- `@mdxe/node`, `@mdxe/bun` — Node / Bun evaluation. Use `@mdxe/workers` (`@mdxe/workers/local` for Miniflare).
- `@mdxe/next`, `@mdxe/honox` — framework runtimes. Use `@mdxe/hono` on Workers; `@mdxe/fumadocs` builds docs sites and deploys them to Workers via OpenNext.
- `@mdxe/electron`, `@mdxe/expo`, `@mdxdb/desktop`, `@mdxdb/mobile`, `@mdxdb/studio` — desktop / mobile shells and the Studio editor. The `apps/desktop` and `apps/mobile` app shells went with them.
- `@mdxe/remotion`, `@mdxe/slidev` — video / slide runtimes. `@mdxui/video` and `@mdxui/slides` keep only the abstract types.
- `@mdxe/vercel`, `@mdxe/github` — deploy providers for other hosts.
- `@mdxe/payload`, `@mdxdb/payload` — Payload CMS runtime and adapter.
- `@mdxdb/postgres`, `@mdxdb/mongo`, `@mdxdb/git` — storage adapters that cannot run in workerd (`@mdxdb/git` was a `?` in the issue; it needs `node:fs` and `isomorphic-git/http/node`). Use `@mdxdb/do`, `@mdxdb/sqlite`, `@mdxdb/vectorize` or `@mdxdb/clickhouse`.

Breaking changes in the packages that remain:

- **mdxe**: the `admin` command (Payload) and the `mdxe db studio` sub-command are gone; `mdxe deploy --platform` accepts only `do` and `cloudflare`; `DeployOptions.platform` is `'do' | 'cloudflare' | 'custom'`; `SourceTypeInfo.adapter` replaces `'postgres' | 'mongo'` with `'do'`. `@mdxe/deploy` is now a `workspace:*` dependency.
- **@mdxe/deploy**: `Platform` is `'do' | 'cloudflare'`; `VercelOptions`, `GitHubOptions`, `deployToVercel`, `deployToGitHub` and the `serverless` / `edge` deploy targets are removed; `vercel.json` / `.vercel` no longer influence `detectPlatform`.
- **@mdxe/cloudflare**: `SourceTypeInfo.adapter` replaces `'postgres' | 'mongo'` with `'do'`; `detectSourceType` recognises `@mdxdb/do`.
- **@mdxai/claude**: the `mdxe_deploy` tool's `platform` enum is `do | cloudflare | custom`.

`test/repo/package-allowlist.test.ts` is the allowlist for `packages/@mdxe` and `packages/@mdxdb`; a directory that is not on it fails `pnpm test:repo`.
