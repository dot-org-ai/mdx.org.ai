/**
 * @mdxld/types - Format Interface
 *
 * Common interface for all format converters.
 * Similar to JSON.parse/stringify but with fetch() for URLs.
 */

/**
 * Base Format interface that all format converters implement.
 * Provides a consistent API across JSON, YAML, CSV, HTML, Markdown, etc.
 *
 * @example
 * ```ts
 * // All formats follow the same pattern
 * JSON.parse(string)      // Parse string to object
 * JSON.stringify(object)  // Convert object to string
 * JSON.fetch(url)         // Fetch URL and parse response
 *
 * YAML.parse(string)
 * YAML.stringify(object)
 * YAML.fetch(url)
 *
 * CSV.parse(string)
 * CSV.stringify(records)
 * CSV.fetch(url)
 * ```
 */
export interface Format<T = unknown, ParseOptions = unknown, StringifyOptions = unknown, Input = string | ArrayBuffer, Output = string | ArrayBuffer> {
  /**
   * Parse a string (or ArrayBuffer for binary formats) to the target type.
   */
  parse(input: Input, options?: ParseOptions): T

  /**
   * Convert data to string (or ArrayBuffer for binary formats).
   * Optional - some formats like PDF are read-only.
   */
  stringify?(data: T, options?: StringifyOptions): Output

  /**
   * Fetch a URL and parse the response as this format.
   * Handles content-type detection and appropriate parsing.
   */
  fetch(url: string, options?: FormatFetchOptions & ParseOptions): Promise<T>

  /** Format name (e.g., 'json', 'yaml', 'csv') */
  readonly name: string

  /** MIME types this format handles */
  readonly mimeTypes: readonly string[]

  /** File extensions this format handles (without dot) */
  readonly extensions: readonly string[]
}

/**
 * Options for fetching remote resources.
 */
export interface FormatFetchOptions {
  /** Custom fetch headers */
  headers?: Record<string, string>
  /** Request timeout in milliseconds */
  timeout?: number
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch
}

/**
 * Format that supports bi-directional conversion (parse and stringify).
 * Use TextFormat for text-only formats, BinaryFormat for binary-only formats.
 */
export interface BiDirectionalFormat<T = unknown, ParseOptions = unknown, StringifyOptions = unknown, Input = string | ArrayBuffer, Output = string | ArrayBuffer>
  extends Format<T, ParseOptions, StringifyOptions, Input, Output> {
  stringify(data: T, options?: StringifyOptions): Output
}

/**
 * Text-based format (JSON, YAML, Markdown, HTML, CSV).
 * Input and output are always strings.
 */
export interface TextFormat<T = unknown, ParseOptions = unknown, StringifyOptions = unknown>
  extends BiDirectionalFormat<T, ParseOptions, StringifyOptions, string, string> {
  stringify(data: T, options?: StringifyOptions): string
}

/**
 * Binary format (XLSX).
 * Input and output can be ArrayBuffer.
 */
export interface BinaryFormat<T = unknown, ParseOptions = unknown, StringifyOptions = unknown>
  extends BiDirectionalFormat<T, ParseOptions, StringifyOptions, string | ArrayBuffer, ArrayBuffer> {
  stringify(data: T, options?: StringifyOptions): ArrayBuffer
}

/**
 * Format that only supports reading (e.g., PDF).
 */
export interface ReadOnlyFormat<T = unknown, ParseOptions = unknown>
  extends Omit<Format<T, ParseOptions, never>, 'stringify'> {
  readonly readonly: true
}

/**
 * Format for tabular text data (CSV, TSV).
 */
export interface TabularFormat<
  T = Record<string, unknown>[],
  ParseOptions = TabularParseOptions,
  StringifyOptions = TabularStringifyOptions
> extends TextFormat<T, ParseOptions, StringifyOptions> {
  /** Get column headers from parsed data */
  getHeaders(data: T): string[]
}

/**
 * Format for tabular binary data (XLSX).
 */
export interface TabularBinaryFormat<
  T = Record<string, unknown>[],
  ParseOptions = TabularParseOptions,
  StringifyOptions = TabularStringifyOptions
> extends BinaryFormat<T, ParseOptions, StringifyOptions> {
  /** Get column headers from parsed data */
  getHeaders(data: T): string[]
}

export interface TabularParseOptions {
  /** Whether first row contains headers */
  headers?: boolean | string[]
  /** Skip empty rows */
  skipEmpty?: boolean
  /** Transform values during parsing */
  transform?: (value: string, column: string) => unknown
  /** Custom delimiter (for CSV/TSV) */
  delimiter?: string
}

export interface TabularStringifyOptions {
  /** Include header row */
  headers?: boolean | string[]
  /** Custom delimiter (for CSV/TSV) */
  delimiter?: string
  /** Quote all values */
  quoteAll?: boolean
  /** Line ending style */
  lineEnding?: '\n' | '\r\n'
}

/**
 * Format for documents with structured content (HTML, Markdown).
 */
export interface DocumentFormat<T = unknown, ParseOptions = unknown, StringifyOptions = unknown>
  extends TextFormat<T, ParseOptions, StringifyOptions> {
  /** Extract metadata/frontmatter from document */
  extractMeta?(input: string): Record<string, unknown>
}

/**
 * Helper type to create a format object with standard methods.
 */
export type CreateFormat<T, PO = unknown, SO = unknown> = {
  parse: (input: string | ArrayBuffer, options?: PO) => T
  stringify?: (data: T, options?: SO) => string | ArrayBuffer
  fetch: (url: string, options?: FormatFetchOptions & PO) => Promise<T>
  name: string
  mimeTypes: readonly string[]
  extensions: readonly string[]
}

/**
 * Type guard to check if a format supports stringify.
 */
export function isBiDirectional<T, PO, SO>(
  format: Format<T, PO, SO>
): format is BiDirectionalFormat<T, PO, SO> {
  return typeof format.stringify === 'function'
}

/**
 * Type guard to check if a format is read-only.
 */
export function isReadOnly<T, PO>(
  format: Format<T, PO, never>
): format is ReadOnlyFormat<T, PO> {
  return 'readonly' in format && (format as ReadOnlyFormat<T, PO>).readonly === true
}

/**
 * Type guard to check if a format handles tabular data.
 */
export function isTabular<T extends Record<string, unknown>[]>(
  format: Format<T, TabularParseOptions, TabularStringifyOptions>
): format is TabularFormat<T> {
  return typeof (format as TabularFormat<T>).getHeaders === 'function'
}
