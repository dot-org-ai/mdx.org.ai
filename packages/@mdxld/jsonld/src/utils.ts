import { PROPERTY_SIMPLIFICATIONS, RDF_PREFIXES } from './types.js'

/**
 * Extract the local name from a URI or prefixed name
 * e.g., 'https://schema.org/Person' → 'Person'
 * e.g., 'schema:Person' → 'Person'
 */
export function extractLocalName(uri: string): string {
  if (!uri) return uri

  // Handle prefixed names (e.g., 'schema:Person')
  const colonIndex = uri.indexOf(':')
  if (colonIndex > 0 && !uri.startsWith('http')) {
    return uri.slice(colonIndex + 1)
  }

  // Handle URIs - get last path segment or fragment
  const hashIndex = uri.lastIndexOf('#')
  if (hashIndex >= 0) {
    return uri.slice(hashIndex + 1)
  }

  const slashIndex = uri.lastIndexOf('/')
  if (slashIndex >= 0) {
    return uri.slice(slashIndex + 1)
  }

  return uri
}

/**
 * Extract reference from a JSON-LD reference object (single object only)
 * e.g., { '@id': 'https://schema.org/Person' } → 'Person'
 *
 * Note: This only handles single reference objects. For arrays, use extractRefs()
 * or let convertValue handle the recursion.
 */
export function extractRef(value: unknown, doExtract: boolean = true): unknown {
  if (!doExtract) return value
  if (value === null || value === undefined) return value

  // Don't handle arrays here - let convertValue handle recursion
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // If it's a reference object with only @id, extract the local name
    if ('@id' in obj && Object.keys(obj).length === 1) {
      return extractLocalName(obj['@id'] as string)
    }
    // If it has $id (already converted), extract local name
    if ('$id' in obj && Object.keys(obj).length === 1) {
      return extractLocalName(obj['$id'] as string)
    }
  }

  return value
}

/**
 * Extract references from a value that may be a single ref or array of refs
 * Always returns an array of local names
 * e.g., { '@id': 'schema:Person' } → ['Person']
 * e.g., [{ '@id': 'schema:Person' }, { '@id': 'schema:Thing' }] → ['Person', 'Thing']
 */
export function extractRefs(value: unknown): string[] {
  if (value === null || value === undefined) return []

  const items = Array.isArray(value) ? value : [value]
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return extractLocalName(item)
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        if ('@id' in obj) {
          return extractLocalName(obj['@id'] as string)
        }
        if ('$id' in obj) {
          return extractLocalName(obj['$id'] as string)
        }
      }
      return null
    })
    .filter((x): x is string => x !== null)
}

/**
 * Simplify a property name
 * e.g., 'rdfs:label' → 'label'
 */
export function simplifyPropertyName(
  name: string,
  customMappings?: Record<string, string>
): string {
  // Check custom mappings first
  if (customMappings?.[name]) {
    return customMappings[name]
  }

  // Check built-in simplifications
  if (PROPERTY_SIMPLIFICATIONS[name]) {
    return PROPERTY_SIMPLIFICATIONS[name]
  }

  // Strip common prefixes
  for (const prefix of Object.keys(RDF_PREFIXES)) {
    if (name.startsWith(prefix)) {
      return name.slice(prefix.length)
    }
  }

  return name
}

/**
 * Check if a key is a JSON-LD keyword
 */
export function isJsonLDKeyword(key: string): boolean {
  return key.startsWith('@')
}

/**
 * Check if a key is an MDXLD keyword
 */
export function isMDXLDKeyword(key: string): boolean {
  return key.startsWith('$')
}

/**
 * Remove empty values from an object
 */
export function removeEmptyValues<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length === 0) continue
      result[key] = value
    }
  }
  return result as T
}

/**
 * Ensure a value is an array
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Strip base URL from an ID
 */
export function stripBaseUrl(id: string, baseUrl?: string): string {
  if (!baseUrl || !id) return id
  if (id.startsWith(baseUrl)) {
    return id.slice(baseUrl.length)
  }
  return id
}
