/**
 * Stub for `@mdxe/isolate` inside the workers pool.
 *
 * `@mdxdb/sqlite`'s MDXDatabase imports it lazily for compile/call/meta/
 * render; `@mdxdb/do` overrides those four methods to throw, so the real
 * compiler is never reached from this suite.
 */
const unavailable = (): never => {
  throw new Error('@mdxe/isolate is stubbed in the mdxdb workers suite')
}

export const compileToModule = unavailable
export const createWorkerConfig = unavailable
export const getExports = unavailable
