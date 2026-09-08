---
'mdxe': minor
'mdxai': minor
---

Remove the `@mdxe/rpc` and `@mdxai/agentkit` packages (mdx-8je.6).

Both were near-complete duplicates of primitives that already ship in the workspace:

- `@mdxe/rpc` reimplemented `RPCServer` / `RPCClient` over fetch while advertising capnweb. Use `rpc.do` directly (`RPC`, `RPCPromise`; capnweb transport via `@dotdo/capnweb`). `mdxe` re-exports no RPC types: the `export type { RPC, RPCPromise } from 'ai-functions'` it briefly carried did not compile (`ai-functions@2.4` ships neither symbol) and is removed. `mdxe` never re-exported `@mdxe/rpc` itself, so this is not a breaking change for `mdxe` consumers.
- `@mdxai/agentkit` overlapped the `autonomous-agents` primitive that `mdxai` already depends on. Use `autonomous-agents`.

Consumers who installed either package directly must migrate to `rpc.do` / `autonomous-agents`; neither package will receive further releases.
