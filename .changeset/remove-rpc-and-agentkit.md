---
'mdxe': minor
'mdxai': minor
---

Remove the `@mdxe/rpc` and `@mdxai/agentkit` packages (mdx-8je.6).

Both were near-complete duplicates of primitives that already ship in the workspace:

- `@mdxe/rpc` reimplemented `RPCServer` / `RPCClient` over fetch while advertising capnweb. Use the capnweb `RPC` / `RPCPromise` from `ai-functions` directly; `mdxe` keeps re-exporting those types (it never re-exported `@mdxe/rpc` itself, so this is not a breaking change for `mdxe` consumers).
- `@mdxai/agentkit` overlapped the `autonomous-agents` primitive that `mdxai` already depends on. Use `autonomous-agents`.

Consumers who installed either package directly must migrate to `ai-functions` / `autonomous-agents`; neither package will receive further releases.
