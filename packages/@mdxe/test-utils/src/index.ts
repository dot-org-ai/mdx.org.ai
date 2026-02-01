/**
 * @mdxe/test-utils - Shared test utilities for MDX packages
 *
 * Provides fixtures, mocks, and custom matchers for testing MDX content.
 *
 * @example
 * ```ts
 * // Import fixtures
 * import { createMDXFixture, FIXTURE_PRESETS } from '@mdxe/test-utils'
 *
 * // Import mocks
 * import { createMockMiniflare, createMockEnv } from '@mdxe/test-utils'
 *
 * // Import matchers (auto-extends expect)
 * import '@mdxe/test-utils/matchers'
 *
 * // Use in tests
 * const mdx = createMDXFixture({
 *   frontmatter: { title: 'Test' },
 *   content: '# Hello'
 * })
 *
 * expect(mdx).toBeValidMDX()
 * expect(mdx).toHaveFrontmatter({ title: 'Test' })
 * ```
 */

// Re-export types
export type {
  MDXFixtureOptions,
  CodeBlockOptions,
  ExportDefinition,
  ComponentDefinition,
  ParsedMDXDocument,
  MockMiniflareOptions,
  MockMiniflare,
  MockWorkerLoader,
  MockWorkerInstance,
  MockKVNamespace,
  MockD1Database,
  MockD1Statement,
  MockLoaderOptions,
  MatcherResult,
  CompiledMDXResult,
} from './types'

// Re-export fixtures
export {
  createMDXFixture,
  createSimpleMDX,
  createMDXWithFrontmatter,
  createMDXWithExports,
  createMDXWithCodeBlocks,
  createMDXWithComponents,
  FIXTURE_PRESETS,
} from './fixtures'

// Re-export mocks
export {
  createMockMiniflare,
  createMockWorkerLoader,
  createMockKVNamespace,
  createMockD1Database,
  createMockResponse,
  createMockRequest,
  createMockEnv,
  createMockExecutionContext,
  createMockCache,
} from './mocks'

export type {
  MockMiniflareConfig,
  MockWorkerLoaderConfig,
  MockKVConfig,
  MockD1Config,
  MockResponseOptions,
  MockRequestOptions,
  MockEnvOptions,
} from './mocks'

// Re-export matchers (importing this extends expect automatically)
export { mdxMatchers } from './matchers'

// Re-export ports utilities
export {
  isPortAvailable,
  getRandomPort,
  reservePort,
  releasePort,
  getRandomPorts,
  releaseAllPorts,
  getReservedPortCount,
  getReservedPorts,
  PortRange,
  createPortRange,
  waitForPortRelease,
} from './ports'

export type { PortAllocationOptions } from './ports'

// Re-export timing utilities
export {
  retry,
  sleep,
  waitUntil,
  withTimeout,
  debounce,
  throttle,
  createDeferred,
  measureTime,
  runSequence,
  runPeriodically,
  FakeTimers,
} from './timing'

export type { RetryOptions, RetryResult } from './timing'

// Re-export logging utilities
export { createLogger } from './logging'

export type { Logger, LogLevel, LogContext, LoggerOptions } from './logging'
