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
 * Helper type to create typed data with $type discriminator
 * Used by extension packages (schema.org.ai, business.org.ai) to create discriminated unions
 *
 * @example
 * ```ts
 * // In schema.org.ai package:
 * type ArticleData = TypedData<'Article', { headline: string; author: string }>
 * type PersonData = TypedData<'Person', { name: string; email: string }>
 * type SchemaOrgData = ArticleData | PersonData
 * ```
 */
export type TypedData<TType extends string, TFields extends Record<string, unknown> = Record<string, unknown>> = {
  $type: TType
} & Omit<LDProperties, '$type'> &
  TFields

/**
 * Helper to extract $type literal from typed data
 */
export type ExtractType<T extends MDXLDData> = T extends { $type: infer TType } ? TType : string | string[]

/**
 * Root MDXLD document structure with generic data type support
 *
 * @typeParam TData - The type of the data object, defaults to MDXLDData
 *
 * @example
 * ```ts
 * // Basic usage
 * const doc: MDXLDDocument = parse(content)
 *
 * // With typed data from extension package
 * import { SchemaOrgData } from 'schema.org.ai'
 * const doc: MDXLDDocument<SchemaOrgData> = parse(content) as MDXLDDocument<SchemaOrgData>
 * ```
 */
export interface MDXLDDocument<TData extends MDXLDData = MDXLDData> {
  /** Document identifier (maps to $id in flat mode) */
  id?: string
  /** Document type (maps to $type in flat mode) */
  type?: ExtractType<TData>
  /** JSON-LD context (maps to $context in flat mode) */
  context?: string | string[] | Record<string, unknown>
  /** Structured data from YAML frontmatter */
  data: TData
  /** Raw MDX content body */
  content: string
}

/**
 * Type guard to check if document has a specific $type
 *
 * @example
 * ```ts
 * if (isType(doc, 'Article')) {
 *   // doc.type is 'Article', doc.data.$type is 'Article'
 * }
 * ```
 */
export function isType<T extends string>(doc: MDXLDDocument, type: T): doc is MDXLDDocument<TypedData<T>> {
  return doc.type === type || doc.data.$type === type
}

/**
 * Type guard to check if document has one of multiple types
 */
export function isOneOfTypes<T extends string[]>(doc: MDXLDDocument, types: T): doc is MDXLDDocument<TypedData<T[number]>> {
  const docType = doc.type ?? doc.data.$type
  if (Array.isArray(docType)) {
    return docType.some((t) => types.includes(t as T[number]))
  }
  return types.includes(docType as T[number])
}

/**
 * Create a typed document factory for a specific type
 *
 * @example
 * ```ts
 * const createArticle = createTypedDocument<ArticleData>('Article')
 * const article = createArticle({ headline: 'Hello', author: 'John' }, '# Content')
 * ```
 */
export function createTypedDocument<TData extends MDXLDData>(type: ExtractType<TData>) {
  return (data: Omit<TData, '$type'>, content: string): MDXLDDocument<TData> => ({
    type,
    data: { $type: type, ...data } as TData,
    content,
  })
}

/**
 * Extended document with AST (added by mdxld/ast)
 */
export interface MDXLDDocumentWithAST<TData extends MDXLDData = MDXLDData> extends MDXLDDocument<TData> {
  /** Parsed AST representation */
  ast: MDXLDAst
}

/**
 * Extended document with compiled code (added by mdxld/compile)
 */
export interface MDXLDDocumentWithCode<TData extends MDXLDData = MDXLDData> extends MDXLDDocument<TData> {
  /** Compiled JavaScript code */
  code: string
  /** React component (when evaluated) */
  component?: unknown
}

/**
 * Fully extended document with all properties
 */
export interface MDXLDDocumentFull<TData extends MDXLDData = MDXLDData> extends MDXLDDocument<TData> {
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
