/**
 * MDXLD - Parse, Stringify, Validate, and Compile MDXLD Documents
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

// Re-export for convenience (tree-shakable via submodules)
export { toAst, fromAst, parseWithAst, stringifyAst } from './ast.js'
export { compile, compileFromString, evaluate } from './compile.js'
export type { CompileOptions } from './compile.js'

// Relationship extraction
export {
  extractLinks,
  extractRelationships,
  relationships,
  withRelationships,
} from './relationships.js'
export type {
  Relationship,
  RelationshipType,
  ExtractedLink,
  ExtractOptions,
  Reference,
  MDXLDDocumentWithRelationships,
} from './relationships.js'
