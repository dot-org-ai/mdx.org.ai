/**
 * JSON-LD style properties that can appear on any object in flat mode
 */
export interface LDProperties {
  $id?: string
  $type?: string | string[]
  $context?: string | string[] | Record<string, unknown>
}

/**
 * Data object with optional JSON-LD properties
 */
export type MDXLDData = LDProperties & Record<string, unknown>

/**
 * Root MDXLD document structure
 */
export interface MDXLDDocument {
  /** Document identifier (maps to $id in flat mode) */
  id?: string
  /** Document type (maps to $type in flat mode) */
  type?: string | string[]
  /** JSON-LD context (maps to $context in flat mode) */
  context?: string | string[] | Record<string, unknown>
  /** Structured data from YAML frontmatter */
  data: MDXLDData
  /** Raw MDX content body */
  content: string
}

/**
 * Extended document with AST (added by mdxld/ast)
 */
export interface MDXLDDocumentWithAST extends MDXLDDocument {
  /** Parsed AST representation */
  ast: MDXLDAst
}

/**
 * Extended document with compiled code (added by mdxld/compile)
 */
export interface MDXLDDocumentWithCode extends MDXLDDocument {
  /** Compiled JavaScript code */
  code: string
  /** React component (when evaluated) */
  component?: unknown
}

/**
 * Fully extended document with all properties
 */
export interface MDXLDDocumentFull extends MDXLDDocument {
  ast?: MDXLDAst
  code?: string
  component?: unknown
}

/**
 * AST node types
 */
export type MDXLDAstNodeType =
  | 'root'
  | 'yaml'
  | 'paragraph'
  | 'heading'
  | 'text'
  | 'emphasis'
  | 'strong'
  | 'inlineCode'
  | 'code'
  | 'link'
  | 'image'
  | 'list'
  | 'listItem'
  | 'blockquote'
  | 'thematicBreak'
  | 'html'
  | 'mdxJsxFlowElement'
  | 'mdxJsxTextElement'
  | 'mdxFlowExpression'
  | 'mdxTextExpression'
  | 'mdxjsEsm'

/**
 * Base AST node
 */
export interface MDXLDAstNode {
  type: MDXLDAstNodeType | string
  children?: MDXLDAstNode[]
  value?: string
  position?: {
    start: { line: number; column: number; offset: number }
    end: { line: number; column: number; offset: number }
  }
  [key: string]: unknown
}

/**
 * Root AST node
 */
export interface MDXLDAst extends MDXLDAstNode {
  type: 'root'
  children: MDXLDAstNode[]
}

/**
 * Parse options
 */
export interface ParseOptions {
  /**
   * Output mode for data properties
   * - 'expanded': Use id, type, context at root level (default)
   * - 'flat': Keep $id, $type, $context in data object
   */
  mode?: 'expanded' | 'flat'
}

/**
 * Stringify options
 */
export interface StringifyOptions {
  /**
   * Output mode for YAML frontmatter
   * - 'expanded': Read from id, type, context and write as $id, $type, $context
   * - 'flat': Write data object as-is with $id, $type, $context
   */
  mode?: 'expanded' | 'flat'
}
