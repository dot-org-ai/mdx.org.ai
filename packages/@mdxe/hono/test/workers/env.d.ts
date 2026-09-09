/// <reference types="@cloudflare/vitest-pool-workers" />

// No bindings: the test worker is a plain Hono app (see worker.ts), so `cloudflare:test`'s
// default `ProvidedEnv` is left as declared by the pool.
export {}
