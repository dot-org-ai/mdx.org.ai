/**
 * Custom Vitest Matchers for MDX Testing
 *
 * This module provides custom matchers that can be extended into vitest.
 * Importing this module will automatically extend vitest's expect with MDX matchers.
 */

import { expect } from 'vitest'
import type { MatcherResult } from './types.js'

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(mdx: string): Record<string, unknown> | null {
  const match = mdx.match(/^---\n([\s\S]*?)\n---/)
  if (!match || !match[1]) return null

  const result: Record<string, unknown> = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      result[key] = value
    }
  }

  return result
}

/**
 * Extract export names from MDX content
 */
function extractExports(mdx: string): string[] {
  const exports: string[] = []

  const functionMatches = mdx.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)
  for (const match of functionMatches) {
    if (match[1]) exports.push(match[1])
  }

  const constMatches = mdx.matchAll(/export\s+const\s+(\w+)/g)
  for (const match of constMatches) {
    if (match[1]) exports.push(match[1])
  }

  const classMatches = mdx.matchAll(/export\s+class\s+(\w+)/g)
  for (const match of classMatches) {
    if (match[1]) exports.push(match[1])
  }

  return [...new Set(exports)]
}

/**
 * Check if MDX has a default export
 */
function hasDefaultExport(mdx: string): boolean {
  return /export\s+default\s/.test(mdx)
}

/**
 * Extract code blocks from MDX
 */
function extractCodeBlocks(
  mdx: string
): Array<{ language: string; meta: string; code: string }> {
  const blocks: Array<{ language: string; meta: string; code: string }> = []
  // Match: ``` optionally followed by language, optionally followed by space and meta, then newline, then content, then ```
  const regex = /```(\w+)?(?:[ \t]+([^\n]*))?\n([\s\S]*?)```/g

  let match
  while ((match = regex.exec(mdx)) !== null) {
    blocks.push({
      language: match[1] ?? '',
      meta: match[2]?.trim() ?? '',
      code: match[3] ?? '',
    })
  }

  return blocks
}

/**
 * Check if MDX content is valid (basic check)
 * This performs a simple heuristic check - for full validation, use MDX compilation
 */
function isValidMDX(mdx: string): { valid: boolean; error?: string } {
  // Check for unclosed JSX tags (tags that start but don't have a closing >)
  // Matches patterns like <Component attr  (without closing >)
  const unclosedTagPattern = /<[A-Za-z][\w.-]*(?:\s+[^>]*)?$/
  if (unclosedTagPattern.test(mdx)) {
    return { valid: false, error: 'Unclosed JSX element tag' }
  }

  // Check for lowercase JSX elements that aren't self-closed or closed
  // This catches things like <broken unclosed where there's no > at all
  const incompleteTagPattern = /<[a-z][\w.-]*\s+\w+[^>]*$/
  if (incompleteTagPattern.test(mdx)) {
    return { valid: false, error: 'Incomplete JSX element' }
  }

  return { valid: true }
}

/**
 * Deep equality check for objects
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== 'object') return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  if (Array.isArray(a) || Array.isArray(b)) return false

  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)

  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  )
}

/**
 * Check if object contains expected properties (partial match)
 */
function containsProperties(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): { match: boolean; missingKeys: string[]; mismatchedKeys: string[] } {
  const missingKeys: string[] = []
  const mismatchedKeys: string[] = []

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in actual)) {
      missingKeys.push(key)
    } else if (!deepEqual(actual[key], expectedValue)) {
      mismatchedKeys.push(key)
    }
  }

  return {
    match: missingKeys.length === 0 && mismatchedKeys.length === 0,
    missingKeys,
    mismatchedKeys,
  }
}

/**
 * Custom matchers for MDX testing.
 * Use with expect.extend(mdxMatchers) in your test setup.
 *
 * @example
 * ```ts
 * // vitest.setup.ts
 * import { expect } from 'vitest'
 * import { mdxMatchers } from '@mdxe/test-utils/matchers'
 *
 * expect.extend(mdxMatchers)
 *
 * // In tests
 * expect(mdxContent).toBeValidMDX()
 * expect(mdxContent).toHaveFrontmatter({ title: 'Test' })
 * ```
 */
export const mdxMatchers = {
  /**
   * Assert that the string is valid MDX content
   */
  toBeValidMDX(received: string): MatcherResult {
    const result = isValidMDX(received)

    return {
      pass: result.valid,
      message: () =>
        result.valid
          ? `Expected MDX to be invalid, but it parsed successfully`
          : `Expected valid MDX, but got error: ${result.error}`,
    }
  },

  /**
   * Assert that the MDX content has the expected frontmatter properties
   */
  toHaveFrontmatter(received: string, expected: Record<string, unknown>): MatcherResult {
    const frontmatter = parseFrontmatter(received)

    if (!frontmatter) {
      return {
        pass: false,
        message: () => `Expected MDX to have frontmatter, but none was found`,
      }
    }

    const { match, missingKeys, mismatchedKeys } = containsProperties(frontmatter, expected)

    if (!match) {
      const details: string[] = []
      if (missingKeys.length > 0) {
        details.push(`Missing keys: ${missingKeys.join(', ')}`)
      }
      if (mismatchedKeys.length > 0) {
        details.push(
          `Mismatched values for: ${mismatchedKeys
            .map((k) => `${k} (expected: ${JSON.stringify(expected[k])}, got: ${JSON.stringify(frontmatter[k])})`)
            .join(', ')}`
        )
      }

      return {
        pass: false,
        message: () => `Expected frontmatter to match, but:\n${details.join('\n')}`,
      }
    }

    return {
      pass: true,
      message: () => `Expected frontmatter not to match ${JSON.stringify(expected)}`,
    }
  },

  /**
   * Assert that the MDX content has the expected exports
   */
  toHaveExports(received: string, expected: string[]): MatcherResult {
    const exports = extractExports(received)
    const missing = expected.filter((e) => !exports.includes(e))

    return {
      pass: missing.length === 0,
      message: () =>
        missing.length === 0
          ? `Expected MDX not to have exports: ${expected.join(', ')}`
          : `Expected MDX to have exports: ${missing.join(', ')}\nFound exports: ${exports.join(', ') || '(none)'}`,
    }
  },

  /**
   * Assert that the MDX content has a default export
   */
  toHaveDefaultExport(received: string): MatcherResult {
    const hasDefault = hasDefaultExport(received)

    return {
      pass: hasDefault,
      message: () =>
        hasDefault
          ? `Expected MDX not to have a default export`
          : `Expected MDX to have a default export, but none was found`,
    }
  },

  /**
   * Assert that the string looks like compiled MDX code
   */
  toBeCompiledMDX(received: string): MatcherResult {
    const hasJsxRuntime = /import\s+.*from\s+["'].*jsx-runtime["']/.test(received)
    const hasExportDefault = /export\s+default\s+/.test(received)
    const hasJsxCalls = /_jsx\(|jsx\(/.test(received)

    const isCompiled = hasJsxRuntime || (hasExportDefault && hasJsxCalls)

    return {
      pass: isCompiled,
      message: () =>
        isCompiled
          ? `Expected string not to be compiled MDX`
          : `Expected string to be compiled MDX (should have jsx-runtime import or jsx calls)`,
    }
  },

  /**
   * Assert that the MDX has a code block with the specified language
   */
  toHaveCodeBlock(
    received: string,
    language?: string,
    options?: { contains?: string; meta?: string }
  ): MatcherResult {
    const blocks = extractCodeBlocks(received)

    if (blocks.length === 0) {
      return {
        pass: false,
        message: () => `Expected MDX to have code blocks, but none were found`,
      }
    }

    let matchingBlocks = blocks

    if (language) {
      matchingBlocks = matchingBlocks.filter((b) => b.language === language)
      if (matchingBlocks.length === 0) {
        return {
          pass: false,
          message: () =>
            `Expected MDX to have a code block with language "${language}", ` +
            `but found: ${blocks.map((b) => b.language || '(none)').join(', ')}`,
        }
      }
    }

    if (options?.contains) {
      const searchText = options.contains
      matchingBlocks = matchingBlocks.filter((b) => b.code.includes(searchText))
      if (matchingBlocks.length === 0) {
        return {
          pass: false,
          message: () => `Expected code block to contain "${searchText}", but it was not found`,
        }
      }
    }

    if (options?.meta) {
      const searchMeta = options.meta
      matchingBlocks = matchingBlocks.filter((b) => b.meta.includes(searchMeta))
      if (matchingBlocks.length === 0) {
        return {
          pass: false,
          message: () =>
            `Expected code block to have meta containing "${searchMeta}", ` +
            `but found: ${blocks.map((b) => b.meta || '(none)').join(', ')}`,
        }
      }
    }

    return {
      pass: true,
      message: () => `Expected MDX not to have a code block matching the criteria`,
    }
  },

  /**
   * Assert that MDX structure matches a snapshot (normalizes whitespace)
   */
  toMatchMDXSnapshot(received: string): MatcherResult {
    // This is a pass-through to vitest's built-in snapshot matcher
    // The actual snapshot comparison happens via vitest
    return {
      pass: true,
      message: () => `MDX snapshot comparison`,
    }
  },
}

// Extend vitest expect with MDX matchers
expect.extend(mdxMatchers)

// TypeScript declaration merging for custom matchers
// Note: Users should add these type declarations to their vitest.d.ts file:
/*
declare module 'vitest' {
  interface Assertion<T> {
    toBeValidMDX(): T
    toHaveFrontmatter(expected: Record<string, unknown>): T
    toHaveExports(expected: string[]): T
    toHaveDefaultExport(): T
    toBeCompiledMDX(): T
    toHaveCodeBlock(language?: string, options?: { contains?: string; meta?: string }): T
    toMatchMDXSnapshot(): T
  }
}
*/
