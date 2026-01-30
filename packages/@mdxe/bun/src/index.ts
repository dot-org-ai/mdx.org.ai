/**
 * @mdxe/bun - Bun runtime for mdxe
 *
 * Fast MDX server, test runner, and script executor using Bun's native APIs.
 * Optimized for Bun's performance characteristics.
 *
 * Features:
 * - Development and production servers with Hono routing
 * - MDX file loader plugin for direct imports
 * - Test runner for MDX test blocks
 * - Script evaluation and execution
 *
 * @packageDocumentation
 */

// Re-export from mdxld
export { parse, stringify } from 'mdxld'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

// Server exports
export {
  createApp,
  createDevServer,
  createServer,
  type ServerOptions,
  type BuildOptions,
  type SiteConfig,
} from './server.js'

// Evaluate exports (Miniflare-based)
export {
  evaluate,
  evaluateFile,
  run,
  runFile,
  createExpect,
  createEvaluator,
  disposeAll,
  getActiveInstanceCount,
  test,
  // Types
  type EvaluateOptions,
  type EvaluateResult,
  type Evaluator,
  type MiniflareConfig,
  // Re-exports from @mdxe/isolate
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getExports,
  type CompiledModule,
  type CompileToModuleOptions,
  type SandboxOptions,
  type WorkerConfig,
} from './evaluate.js'

// Extract exports
export {
  extractTests,
  extractTestsFromFile,
  findMDXTestFiles,
  parseMeta,
  stripTypeScript,
  type TestBlock,
  type MDXTestFile,
  type ExtractTestsOptions,
} from './extract.js'

// Test runner exports
export {
  runTests,
  runTestsFromContent,
  runTestsFromFile,
  registerMDXTests,
  createTestPreload,
  type TestResult,
  type TestFileResult,
  type TestRunResult,
  type RunTestsOptions,
} from './test.js'

// Loader exports
export {
  registerLoader,
  transformMDX,
  transformMDXForTest,
} from './loader.js'

// Runner exports (bun test integration)
export {
  runMDXTestsWithBun,
  loadConfig,
  generateTestFile,
  generateTestFiles,
  writeTestFiles,
  runBunTests,
  createPreloadScript,
  type RunnerConfig,
} from './runner.js'
