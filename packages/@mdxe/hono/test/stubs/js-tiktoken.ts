/**
 * Stub for the OPTIONAL precise token backend under the workers pool.
 *
 * `@mdxe/hono` does not depend on `js-tiktoken`; the `@mdxe/cli-core` token oracle reaches it
 * through a lazy `import()` and falls back to the LABELLED `chars-approx` count when it cannot
 * load. Under @cloudflare/vitest-pool-workers an unresolvable bare specifier is reported by the
 * vite-node runner as an uncaught module-load rejection (not a catchable throw), which would fail
 * the test even though the oracle's fallback ran. Aliasing the specifier to this module (which
 * exports no `getEncoding`) makes the load succeed and the oracle's own "backend unloadable" path
 * decide — so the suite pins that the served count is labelled, never that it is precise.
 */
export {}
