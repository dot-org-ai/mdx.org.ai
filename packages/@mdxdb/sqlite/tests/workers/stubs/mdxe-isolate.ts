/**
 * Test stub for the optional `@mdxe/isolate` peer dependency.
 *
 * `MDXDatabase` dynamically imports `@mdxe/isolate` only inside the code
 * execution path (compile/call/meta/render). Vite's import analysis still
 * needs the specifier to resolve, and the workspace package may not be built
 * when running `pnpm --filter @mdxdb/sqlite test` on its own, so the workers
 * pool aliases it here. The code-execution path itself also needs a Worker
 * Loader binding (`env.LOADER`) that the test pool does not provide, so it is
 * deliberately not exercised; every export throws to make that explicit.
 */

const NOT_AVAILABLE = '@mdxe/isolate is stubbed in the @mdxdb/sqlite workers test pool'

export function compileToModule(): never {
  throw new Error(NOT_AVAILABLE)
}

export function createWorkerConfig(): never {
  throw new Error(NOT_AVAILABLE)
}

export function getExports(): never {
  throw new Error(NOT_AVAILABLE)
}
