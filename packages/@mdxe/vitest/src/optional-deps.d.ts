/**
 * Type declarations for optional dependencies
 * These modules may not be installed or may not have type declarations
 */

// @mdxld/compile - optional compilation module
declare module '@mdxld/compile' {
  export function transformTestCode(code: string): Promise<string>
}
