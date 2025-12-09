/**
 * MDXLD - Lightweight MDX + Linked Data parser and stringifier
 *
 * This is the core package providing:
 * - parse: Parse MDXLD content with YAML frontmatter
 * - stringify: Convert MDXLD documents back to string
 *
 * For additional functionality, use:
 * - @mdxld/ast: AST manipulation and analysis
 * - @mdxld/compile: JSX compilation with esbuild
 * - @mdxld/evaluate: MDX execution and rendering
 * - @mdxld/validate: Schema validation
 *
 * Optional primitives integration:
 * - mdxld/functions: AI functions, RPC, generation (requires ai-functions)
 * - mdxld/database: Schema-first DB with bi-directional relationships (requires ai-database)
 * - mdxld/workflows: Event-driven workflows with $ context (requires ai-workflows)
 *
 * @packageDocumentation
 */

// Core types
export type {
  LDProperties,
  MDXLDData,
  MDXLDDocument,
  MDXLDDocumentWithAST,
  MDXLDDocumentWithCode,
  MDXLDDocumentFull,
  MDXLDAst,
  MDXLDAstNode,
  MDXLDAstNodeType,
  ParseOptions,
  StringifyOptions,
  // Generic type utilities
  TypedData,
  ExtractType,
} from './types.js'

// Type guard and factory functions
export { isType, isOneOfTypes, createTypedDocument } from './types.js'

// Core functions
export { parse } from './parse.js'
export { stringify } from './stringify.js'

// Format utilities
export { format, formatTypeComments, formatTypeDefinition, type FormatOptions } from './format.js'

// Types extraction utilities
export {
  extractTypesFromContent,
  generateDtsFromTypes,
  deduplicateTypes,
  sortTypes,
  type ExtractedType,
  type TypesExtractOptions,
} from './types-extract.js'

// AST utilities
export { toAst } from './ast.js'
