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
} from './types.js'

// Core functions
export { parse } from './parse.js'
export { stringify } from './stringify.js'

// Re-export for convenience (tree-shakable via submodules)
export { toAst, fromAst, parseWithAst, stringifyAst } from './ast.js'
export { compile, compileFromString, evaluate } from './compile.js'
export type { CompileOptions } from './compile.js'
