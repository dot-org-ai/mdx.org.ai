/**
 * Vite/vitest `?raw` import suffix — returns the file's source as a string.
 * Used by primitives.test.ts to inspect the re-export shims without executing them.
 */
declare module '*?raw' {
  const source: string
  export default source
}
