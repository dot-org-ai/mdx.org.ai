/**
 * @mdxld/formats
 *
 * Unified format utilities with consistent parse/stringify/fetch API.
 * All formats follow the same interface pattern for easy interoperability.
 *
 * @example
 * ```ts
 * import { JSON, YAML, CSV, XLSX, PDF, Markdown, HTML } from '@mdxld/formats'
 *
 * // Parse
 * const jsonData = JSON.parse('{"name": "test"}')
 * const yamlData = YAML.parse('name: test')
 * const csvData = CSV.parse('name,age\nAlice,30')
 *
 * // Stringify
 * const jsonStr = JSON.stringify({ name: 'test' })
 * const yamlStr = YAML.stringify({ name: 'test' })
 * const csvStr = CSV.stringify([{ name: 'Alice', age: 30 }])
 *
 * // Fetch
 * const remoteJson = await JSON.fetch('https://api.example.com/data.json')
 * const remoteYaml = await YAML.fetch('https://example.com/config.yaml')
 * const remoteCsv = await CSV.fetch('https://example.com/data.csv')
 * ```
 */

// Re-export types
export type {
  Format,
  BiDirectionalFormat,
  TextFormat,
  BinaryFormat,
  ReadOnlyFormat,
  TabularFormat,
  TabularBinaryFormat,
  DocumentFormat,
  FormatFetchOptions,
  TabularParseOptions,
  TabularStringifyOptions,
} from '@mdxld/types'

export {
  isBiDirectional,
  isReadOnly,
  isTabular,
} from '@mdxld/types'

// ============================================================================
// JSON
// ============================================================================

export {
  JSONFormat,
  JSONFormat as JSON, // Alias for convenience (use with caution - shadows global JSON)
  toJSON,
  fromJSON,
  fetchJSON,
  parse as parseJSON,
  stringify as stringifyJSON,
  // JSON-LD
  toJSONLD,
  fromJSONLD,
  // JSON Schema
  toJSONSchema,
  // OpenAPI
  toOpenAPI,
  // MCP
  toMCP,
  // GraphQL
  toGraphQL,
} from '@mdxld/json'

export type {
  ToJSONOptions,
  FromJSONOptions,
  ToJSONLDOptions,
  JSONLDDocument,
  ToJSONSchemaOptions,
  JSONSchema,
  PropertyDef as JSONPropertyDef,
  TypeDef,
  APIEndpoint,
  ToOpenAPIOptions,
  FunctionDef,
  ToMCPOptions,
  MCPTool,
  GraphQLFieldDef,
  GraphQLTypeDef,
  ToGraphQLOptions,
} from '@mdxld/json'

// ============================================================================
// YAML
// ============================================================================

export {
  YAML,
  toYAML,
  fromYAML,
  fetchYAML,
  toYAMLDocuments,
  fromYAMLDocuments,
  createYAMLStream,
  yamlldToJsonld,
  jsonldToYamlld,
} from '@mdxld/yaml'

export type {
  ToYAMLOptions,
  FromYAMLOptions,
  YAMLStreamParser,
} from '@mdxld/yaml'

// ============================================================================
// CSV / TSV
// ============================================================================

export {
  CSV,
  TSV,
  parse as parseCSV,
  stringify as stringifyCSV,
  fromCSV,
  toCSV,
  parseTSV,
  stringifyTSV,
  fromTSV,
  toTSV,
  fetchCSV,
  fetchTSV,
  getHeaders as getCSVHeaders,
  toJSONLD as csvToJSONLD,
  detectDelimiter,
  parseAuto as parseCSVAuto,
} from '@mdxld/csv'

export type {
  CSVParseOptions,
  CSVStringifyOptions,
  CSVRecord,
  CSVData,
} from '@mdxld/csv'

// ============================================================================
// XLSX
// ============================================================================

export {
  XLSX,
  parse as parseXLSX,
  stringify as stringifyXLSX,
  fromXLSX,
  toXLSX,
  fetchXLSX,
  parseAllSheets,
  stringifyMultiSheet,
  getSheetNames,
  getHeaders as getXLSXHeaders,
  toCSV as xlsxToCSV,
  toJSONLD as xlsxToJSONLD,
  fromCSV as xlsxFromCSV,
} from '@mdxld/xlsx'

export type {
  XLSXParseOptions,
  XLSXStringifyOptions,
  XLSXMultiSheetOptions,
  XLSXRecord,
  XLSXData,
  XLSXMultiSheet,
} from '@mdxld/xlsx'

// ============================================================================
// PDF
// ============================================================================

export {
  PDF,
  parse as parsePDF,
  fromPDF,
  fetchPDF,
  extractText as extractPDFText,
  extractMetadata as extractPDFMetadata,
  toMarkdown as pdfToMarkdown,
  toJSONLD as pdfToJSONLD,
  toDocument as pdfToDocument,
  search as searchPDF,
} from '@mdxld/pdf'

export type {
  PDFParseOptions,
  PDFPageData,
  PDFDocument,
  PDFMetadata,
  PDFInfo,
} from '@mdxld/pdf'

// ============================================================================
// Markdown
// ============================================================================

export {
  Markdown,
  toMarkdown,
  fromMarkdown,
  fetchMarkdown,
  diff,
  applyExtract,
} from '@mdxld/markdown'

export type {
  ToMarkdownOptions,
  FromMarkdownOptions,
  DiffResult,
} from '@mdxld/markdown'

// ============================================================================
// HTML
// ============================================================================

export {
  HTML,
  toHTML,
  fromHTML,
  fetchHTML,
  toJSONLDScript,
} from '@mdxld/html'

export type {
  ToHTMLOptions,
  FromHTMLOptions,
  PropertyDef as HTMLPropertyDef,
  EntityDef,
} from '@mdxld/html'

// ============================================================================
// Format Registry
// ============================================================================

import { JSONFormat } from '@mdxld/json'
import { YAML } from '@mdxld/yaml'
import { CSV, TSV } from '@mdxld/csv'
import { XLSX } from '@mdxld/xlsx'
import { PDF } from '@mdxld/pdf'
import { Markdown } from '@mdxld/markdown'
import { HTML } from '@mdxld/html'
import type { Format } from '@mdxld/types'

/**
 * Registry of all available formats.
 */
export const formats = {
  json: JSONFormat,
  yaml: YAML,
  csv: CSV,
  tsv: TSV,
  xlsx: XLSX,
  pdf: PDF,
  markdown: Markdown,
  html: HTML,
} as const

/**
 * Get format by name.
 */
export function getFormat(name: keyof typeof formats): Format {
  return formats[name] as Format
}

/**
 * Get format by file extension.
 */
export function getFormatByExtension(extension: string): Format | undefined {
  const ext = extension.toLowerCase().replace(/^\./, '')
  for (const format of Object.values(formats)) {
    if (format.extensions.includes(ext as never)) {
      return format as Format
    }
  }
  return undefined
}

/**
 * Get format by MIME type.
 */
export function getFormatByMimeType(mimeType: string): Format | undefined {
  const mime = mimeType.toLowerCase().split(';')[0]?.trim()
  if (!mime) return undefined
  for (const format of Object.values(formats)) {
    if (format.mimeTypes.includes(mime as never)) {
      return format as Format
    }
  }
  return undefined
}

/**
 * Parse content using the appropriate format based on file extension.
 */
export function parseByExtension<T = unknown>(
  content: string | ArrayBuffer,
  extension: string,
  options?: unknown
): T {
  const format = getFormatByExtension(extension)
  if (!format) {
    throw new Error(`Unknown file extension: ${extension}`)
  }
  return format.parse(content, options) as T
}

/**
 * Fetch and parse URL, inferring format from extension or content-type.
 */
export async function fetchAndParse<T = unknown>(
  url: string,
  options?: { format?: keyof typeof formats } & Record<string, unknown>
): Promise<T> {
  const { format: formatName, ...fetchOptions } = options ?? {}

  // Use specified format or infer from URL
  let format: Format | undefined
  if (formatName) {
    format = formats[formatName] as Format
  } else {
    // Try to get extension from URL
    const urlPath = new URL(url).pathname
    const ext = urlPath.split('.').pop()
    if (ext) {
      format = getFormatByExtension(ext)
    }
  }

  if (!format) {
    throw new Error(`Could not determine format for URL: ${url}`)
  }

  return format.fetch(url, fetchOptions) as Promise<T>
}
