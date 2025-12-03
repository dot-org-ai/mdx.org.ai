import {
  JSON_LD_KEYWORDS,
  MDXLD_KEYWORDS,
  type ConversionOptions,
  type JsonLDDocument,
  type JsonLDNode,
  type MDXLDDocument,
  type MDXLDNode,
} from './types.js'
import {
  extractLocalName,
  extractRef,
  isJsonLDKeyword,
  isMDXLDKeyword,
  removeEmptyValues,
  simplifyPropertyName,
  stripBaseUrl,
} from './utils.js'

const DEFAULT_OPTIONS: ConversionOptions = {
  simplifyProperties: true,
  extractRefs: true,
  flattenGraph: false,
  removeEmpty: true,
}

/**
 * Convert a JSON-LD document to MDXLD format
 *
 * @example
 * ```ts
 * const jsonld = {
 *   "@context": "https://schema.org",
 *   "@type": "Person",
 *   "name": "Alice"
 * }
 *
 * const mdxld = fromJsonLD(jsonld)
 * // { $context: "https://schema.org", $type: "Person", name: "Alice" }
 * ```
 */
export function fromJsonLD(
  doc: JsonLDDocument | JsonLDNode,
  options: ConversionOptions = {}
): MDXLDDocument | MDXLDNode {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  return convertValue(doc, opts, 'toMDXLD') as MDXLDDocument | MDXLDNode
}

/**
 * Convert an MDXLD document to JSON-LD format
 *
 * @example
 * ```ts
 * const mdxld = {
 *   $context: "https://schema.org",
 *   $type: "Person",
 *   name: "Alice"
 * }
 *
 * const jsonld = toJsonLD(mdxld)
 * // { "@context": "https://schema.org", "@type": "Person", "name": "Alice" }
 * ```
 */
export function toJsonLD(
  doc: MDXLDDocument | MDXLDNode,
  options: ConversionOptions = {}
): JsonLDDocument | JsonLDNode {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  return convertValue(doc, opts, 'toJsonLD') as JsonLDDocument | JsonLDNode
}

type Direction = 'toMDXLD' | 'toJsonLD'

function convertValue(
  value: unknown,
  options: ConversionOptions,
  direction: Direction
): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertValue(item, options, direction))
  }

  if (typeof value === 'object') {
    return convertObject(value as Record<string, unknown>, options, direction)
  }

  return value
}

function convertObject(
  obj: Record<string, unknown>,
  options: ConversionOptions,
  direction: Direction
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    let newKey: string
    let newValue: unknown

    if (direction === 'toMDXLD') {
      // Convert JSON-LD to MDXLD
      if (isJsonLDKeyword(key)) {
        newKey = JSON_LD_KEYWORDS[key as keyof typeof JSON_LD_KEYWORDS] ?? key
      } else if (options.simplifyProperties) {
        newKey = simplifyPropertyName(key, options.propertyMappings)
      } else {
        newKey = key
      }

      // Handle special cases
      if (key === '@id' && options.baseUrl) {
        newValue = stripBaseUrl(value as string, options.baseUrl)
      } else if (key === '@type' && typeof value === 'string') {
        // Extract local name from type
        newValue = extractLocalName(value)
      } else if (key === '@type' && Array.isArray(value)) {
        newValue = value.map((v) => (typeof v === 'string' ? extractLocalName(v) : v))
      } else if (options.extractRefs) {
        // Try to extract refs from reference objects
        newValue = extractRef(value, true)
        if (newValue === value) {
          // Not a simple ref, convert recursively
          newValue = convertValue(value, options, direction)
        }
      } else {
        newValue = convertValue(value, options, direction)
      }
    } else {
      // Convert MDXLD to JSON-LD
      if (isMDXLDKeyword(key)) {
        newKey = MDXLD_KEYWORDS[key as keyof typeof MDXLD_KEYWORDS] ?? key
      } else {
        newKey = key
      }
      newValue = convertValue(value, options, direction)
    }

    result[newKey] = newValue
  }

  if (options.removeEmpty) {
    return removeEmptyValues(result)
  }

  return result
}

/**
 * Extract entities from a JSON-LD @graph
 *
 * @example
 * ```ts
 * const jsonld = {
 *   "@graph": [
 *     { "@type": "Person", "@id": "/alice", "name": "Alice" },
 *     { "@type": "Person", "@id": "/bob", "name": "Bob" }
 *   ]
 * }
 *
 * const entities = extractGraph(jsonld)
 * // [
 * //   { $type: "Person", $id: "/alice", name: "Alice" },
 * //   { $type: "Person", $id: "/bob", name: "Bob" }
 * // ]
 * ```
 */
export function extractGraph(
  doc: JsonLDDocument,
  options: ConversionOptions = {}
): MDXLDNode[] {
  const graph = doc['@graph']
  if (!graph || !Array.isArray(graph)) {
    return []
  }

  return graph.map((node) => fromJsonLD(node, options) as MDXLDNode)
}

/**
 * Find an entity in a JSON-LD @graph by type
 *
 * @example
 * ```ts
 * const person = findByType(jsonld, 'Person')
 * ```
 */
export function findByType(
  doc: JsonLDDocument,
  type: string,
  options: ConversionOptions = {}
): MDXLDNode | undefined {
  const graph = doc['@graph']
  if (!graph || !Array.isArray(graph)) {
    // Check if the document itself matches
    if (doc['@type'] === type || extractLocalName(doc['@type'] as string) === type) {
      return fromJsonLD(doc, options) as MDXLDNode
    }
    return undefined
  }

  const node = graph.find((n) => {
    const nodeType = n['@type']
    if (typeof nodeType === 'string') {
      return nodeType === type || extractLocalName(nodeType) === type
    }
    if (Array.isArray(nodeType)) {
      return nodeType.some((t) => t === type || extractLocalName(t) === type)
    }
    return false
  })

  return node ? (fromJsonLD(node, options) as MDXLDNode) : undefined
}

/**
 * Find an entity in a JSON-LD @graph by ID
 *
 * @example
 * ```ts
 * const person = findById(jsonld, 'https://example.com/alice')
 * ```
 */
export function findById(
  doc: JsonLDDocument,
  id: string,
  options: ConversionOptions = {}
): MDXLDNode | undefined {
  const graph = doc['@graph']
  if (!graph || !Array.isArray(graph)) {
    if (doc['@id'] === id || doc['@id']?.endsWith(id)) {
      return fromJsonLD(doc, options) as MDXLDNode
    }
    return undefined
  }

  const node = graph.find((n) => n['@id'] === id || n['@id']?.endsWith(id))
  return node ? (fromJsonLD(node, options) as MDXLDNode) : undefined
}

/**
 * Filter entities in a JSON-LD @graph
 *
 * @example
 * ```ts
 * const people = filterGraph(jsonld, (node) => node['@type'] === 'Person')
 * ```
 */
export function filterGraph(
  doc: JsonLDDocument,
  predicate: (node: JsonLDNode) => boolean,
  options: ConversionOptions = {}
): MDXLDNode[] {
  const graph = doc['@graph']
  if (!graph || !Array.isArray(graph)) {
    return []
  }

  return graph.filter(predicate).map((node) => fromJsonLD(node, options) as MDXLDNode)
}

/**
 * Transform a JSON-LD document with a custom transform function
 *
 * @example
 * ```ts
 * const result = transform(jsonld, (node) => ({
 *   ...node,
 *   customField: 'value'
 * }))
 * ```
 */
export function transform<T = MDXLDNode>(
  doc: JsonLDDocument,
  transformer: (node: MDXLDNode, index: number, graph: MDXLDNode[]) => T,
  options: ConversionOptions = {}
): T[] {
  const nodes = extractGraph(doc, options)
  return nodes.map((node, index) => transformer(node, index, nodes))
}
