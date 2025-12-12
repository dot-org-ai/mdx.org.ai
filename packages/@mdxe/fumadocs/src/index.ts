/**
 * @mdxe/fumadocs - Zero-config Fumadocs integration for mdxe
 *
 * Automatically detects $type: Docs in MDX files and scaffolds
 * a Fumadocs + Next.js + OpenNext project for zero-config docs publishing.
 *
 * @packageDocumentation
 */

// Detection
export {
  detectDocsType,
  isValidDocsProject,
  type DocsConfig,
  type DocsDetectionResult,
  type DetectionResult,
} from './detect.js'

// Scaffolding
export {
  scaffoldFumadocs,
  getFumadocsOutputDir,
  needsScaffolding,
  type ScaffoldOptions,
  type ScaffoldResult,
} from './scaffold.js'

// Dev server
export {
  runFumadocsDev,
  isDocsProject,
  type DevOptions,
} from './dev.js'

// Build
export {
  buildFumadocs,
  deployFumadocs,
  type BuildOptions,
  type BuildResult,
} from './build.js'

// Re-export templates for advanced usage
export * as templates from './templates/index.js'
