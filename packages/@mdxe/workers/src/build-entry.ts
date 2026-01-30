/**
 * @mdxe/workers/build - Build-time tools for MDX Workers
 *
 * This module provides NODE.JS-ONLY build tools that run on your development machine.
 * Do NOT import this in your Cloudflare Worker - use the main '@mdxe/workers' export instead.
 *
 * Functions in this module:
 * - build() - Bundle MDX projects into Workers-compatible bundles
 * - publish() - Deploy bundles to Cloudflare Workers
 * - buildWorker() - Build and return just the worker code
 * - buildAndPublish() - Build and publish in one step
 *
 * @packageDocumentation
 */

// Build tools (Node.js only)
export { build, buildWorker } from './build.js'
export { publish, buildAndPublish } from './publish.js'

// Types for build configuration
export type {
  BuildOptions,
  BuildResult,
  NamespaceBundle,
  WorkerBundle,
  ContentBundle,
  ContentDocument,
  ContentFunction,
  AssetBundle,
  AssetFile,
  NamespaceMeta,
  WorkerConfig as WorkerMetaConfig,
  BindingConfig,
  BuildInfo,
  PublishOptions,
  PublishResult,
} from './types.js'
