/**
 * @mdxld/yaml
 *
 * Bi-directional conversion between Objects and YAML.
 * Perfect for config files, Kubernetes manifests, CI/CD pipelines.
 */

import { stringify, parse, parseAllDocuments, Document } from 'yaml'
import type { TextFormat, FormatFetchOptions } from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface ToYAMLOptions {
  /** Indentation spaces (default: 2) */
  indent?: number
  /** Flow style nesting level (-1 = block style) */
  flowLevel?: number
  /** Sort object keys alphabetically */
  sortKeys?: boolean
  /** Max line width (default: 80) */
  lineWidth?: number
  /** Disable anchor/alias refs */
  noRefs?: boolean
  /** String quoting style */
  quotingType?: '"' | "'"
  /** Quote all strings */
  forceQuotes?: boolean
}

export interface FromYAMLOptions {
  /** YAML schema to use */
  schema?: 'core' | 'json' | 'failsafe'
  /** Strict parsing mode */
  strict?: boolean
}

// ============================================================================
// toYAML
// ============================================================================

/**
 * Convert an object to YAML string.
 *
 * @example
 * ```ts
 * const yaml = toYAML({
 *   name: 'my-app',
 *   version: '1.0.0',
 *   database: { host: 'localhost', port: 5432 }
 * })
 * ```
 */
export function toYAML<T>(object: T, options: ToYAMLOptions = {}): string {
  const {
    indent = 2,
    flowLevel = -1,
    sortKeys = false,
    lineWidth = 80,
    noRefs = true,
    quotingType = "'",
    forceQuotes = false,
  } = options

  return stringify(object, {
    indent,
    flowCollectionPadding: true,
    defaultKeyType: 'PLAIN',
    defaultStringType: forceQuotes ? 'QUOTE_SINGLE' : 'PLAIN',
    doubleQuotedAsJSON: quotingType === '"',
    singleQuote: quotingType === "'",
    lineWidth,
    sortMapEntries: sortKeys,
    ...(flowLevel >= 0 ? { collectionStyle: 'flow' } : {}),
    ...(noRefs ? { keepSourceTokens: false } : {}),
  })
}

// ============================================================================
// fromYAML
// ============================================================================

/**
 * Parse YAML string to object.
 *
 * @example
 * ```ts
 * const config = fromYAML<AppConfig>(`
 *   name: my-app
 *   replicas: 3
 * `)
 * ```
 */
export function fromYAML<T = Record<string, unknown>>(
  yaml: string,
  options: FromYAMLOptions = {}
): T {
  const { strict = false } = options

  try {
    return parse(yaml, { strict }) as T
  } catch (error) {
    if (strict) {
      throw error
    }
    // Return empty object on parse failure in non-strict mode
    return {} as T
  }
}

// ============================================================================
// Multi-Document Support
// ============================================================================

/**
 * Convert multiple objects to a multi-document YAML string.
 *
 * @example
 * ```ts
 * const yaml = toYAMLDocuments([
 *   { kind: 'Deployment', metadata: { name: 'app' } },
 *   { kind: 'Service', metadata: { name: 'app-svc' } }
 * ])
 * // ---
 * // kind: Deployment
 * // metadata:
 * //   name: app
 * // ---
 * // kind: Service
 * // ...
 * ```
 */
export function toYAMLDocuments<T>(objects: T[], options: ToYAMLOptions = {}): string {
  return objects.map((obj) => toYAML(obj, options)).join('---\n')
}

/**
 * Parse multi-document YAML string to array of objects.
 *
 * @example
 * ```ts
 * const docs = fromYAMLDocuments<K8sResource>(multiDocYaml)
 * ```
 */
export function fromYAMLDocuments<T = Record<string, unknown>>(
  yaml: string,
  options: FromYAMLOptions = {}
): T[] {
  const { strict = false } = options

  try {
    const documents = parseAllDocuments(yaml, { strict })
    return documents.map((doc: Document) => doc.toJS() as T)
  } catch (error) {
    if (strict) {
      throw error
    }
    return []
  }
}

// ============================================================================
// Streaming Support
// ============================================================================

export interface YAMLStreamParser<T> {
  parse: (stream: AsyncIterable<string>) => AsyncGenerator<T>
}

/**
 * Create a streaming YAML parser for large files.
 *
 * @example
 * ```ts
 * const stream = createYAMLStream<K8sResource>()
 * for await (const doc of stream.parse(fileStream)) {
 *   console.log(doc)
 * }
 * ```
 */
export function createYAMLStream<T = Record<string, unknown>>(): YAMLStreamParser<T> {
  return {
    async *parse(stream: AsyncIterable<string>): AsyncGenerator<T> {
      let buffer = ''

      for await (const chunk of stream) {
        buffer += chunk

        // Split on document separators
        const parts = buffer.split(/^---$/m)

        // Process complete documents (all but the last part)
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (part) {
            const doc = part.trim()
            if (doc) {
              yield fromYAML<T>(doc)
            }
          }
        }

        // Keep the last incomplete part in the buffer
        buffer = parts[parts.length - 1] ?? ''
      }

      // Process any remaining content
      const finalDoc = buffer.trim()
      if (finalDoc) {
        yield fromYAML<T>(finalDoc)
      }
    },
  }
}

// ============================================================================
// YAML-LD Utilities
// ============================================================================

/**
 * Convert YAML-LD (MDXLD frontmatter style) keys to JSON-LD keys.
 *
 * Transforms:
 * - `$type` → `@type`
 * - `$id` → `@id`
 * - `$context` → `@context`
 */
export function yamlldToJsonld<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    let newKey = key

    // Transform YAML-LD keys to JSON-LD
    if (key.startsWith('$')) {
      newKey = '@' + key.slice(1)
    }

    // Recursively transform nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[newKey] = yamlldToJsonld(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[newKey] = value.map((item) =>
        item && typeof item === 'object' ? yamlldToJsonld(item as Record<string, unknown>) : item
      )
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Convert JSON-LD keys to YAML-LD (MDXLD frontmatter style) keys.
 *
 * Transforms:
 * - `@type` → `$type`
 * - `@id` → `$id`
 * - `@context` → `$context`
 */
export function jsonldToYamlld<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    let newKey = key

    // Transform JSON-LD keys to YAML-LD
    if (key.startsWith('@')) {
      newKey = '$' + key.slice(1)
    }

    // Recursively transform nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[newKey] = jsonldToYamlld(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[newKey] = value.map((item) =>
        item && typeof item === 'object' ? jsonldToYamlld(item as Record<string, unknown>) : item
      )
    } else {
      result[newKey] = value
    }
  }

  return result
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch YAML from URL and parse.
 *
 * @example
 * ```ts
 * const config = await fetchYAML('https://example.com/config.yaml')
 * ```
 */
export async function fetchYAML<T = Record<string, unknown>>(
  url: string,
  options: FormatFetchOptions & FromYAMLOptions = {}
): Promise<T> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal as AbortSignal,
    } as RequestInit)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return fromYAML<T>(text, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * YAML Format object implementing the standard Format interface.
 *
 * @example
 * ```ts
 * import { YAML } from '@mdxld/yaml'
 *
 * const data = YAML.parse('name: test')
 * const str = YAML.stringify(data)
 * const remote = await YAML.fetch('https://example.com/config.yaml')
 * ```
 */
export const YAML: TextFormat<unknown, FromYAMLOptions, ToYAMLOptions> = {
  name: 'yaml',
  mimeTypes: ['application/yaml', 'text/yaml', 'application/x-yaml', 'text/x-yaml'] as const,
  extensions: ['yaml', 'yml'] as const,
  parse: fromYAML,
  stringify: toYAML,
  fetch: fetchYAML,
}

// Default export
export default YAML
