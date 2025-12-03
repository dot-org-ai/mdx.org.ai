/**
 * Schema.org specific helpers for working with schema.org vocabulary
 */

import { fromJsonLD, findByType, filterGraph } from './convert.js'
import { extractLocalName, extractRefs } from './utils.js'
import type { JsonLDDocument, JsonLDNode, MDXLDNode, ConversionOptions } from './types.js'

/**
 * Schema.org type definition
 */
export interface SchemaType {
  $type: string
  $id: string
  label: string
  description: string
  subClassOf?: string | string[]
  properties?: SchemaProperty[]
}

/**
 * Schema.org property definition
 */
export interface SchemaProperty {
  $type: string
  $id: string
  name: string
  description: string
  domainIncludes: string[]
  rangeIncludes: string[]
  subPropertyOf?: string
  inverseOf?: string
  supersededBy?: string
}

const SCHEMA_OPTIONS: ConversionOptions = {
  simplifyProperties: true,
  extractRefs: true,
  removeEmpty: true,
}

/**
 * Extract a schema.org type definition from vocabulary JSON-LD
 *
 * @example
 * ```ts
 * const vocab = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
 * const personType = extractType(vocab, 'Person')
 * // { $type: 'Class', label: 'Person', description: '...', subClassOf: 'Thing', properties: [...] }
 * ```
 */
export function extractType(
  doc: JsonLDDocument,
  typeName: string,
  options: { includeProperties?: boolean } = {}
): SchemaType | undefined {
  const { includeProperties = true } = options
  const graph = doc['@graph']
  if (!graph) return undefined

  // Find the type definition
  const typeNode = graph.find((n) => {
    const id = n['@id'] as string | undefined
    return id?.endsWith(`/${typeName}`) || id === typeName
  })

  if (!typeNode) return undefined

  // Convert the type node
  const converted = fromJsonLD(typeNode, SCHEMA_OPTIONS) as MDXLDNode

  // Extract subClassOf
  const subClassOf = typeNode['rdfs:subClassOf']
  const subClassOfValue = subClassOf
    ? extractRefs(subClassOf)
    : undefined

  const result: SchemaType = {
    $type: converted.$type as string || 'Class',
    $id: converted.$id as string || `https://schema.org/${typeName}`,
    label: (converted.label as string) || typeName,
    description: (converted.description as string) || '',
    subClassOf: subClassOfValue?.length === 1 ? subClassOfValue[0] : subClassOfValue,
  }

  // Optionally include properties that have this type in domainIncludes
  if (includeProperties) {
    result.properties = extractPropertiesForType(doc, typeName)
  }

  return result
}

/**
 * Extract a schema.org property definition from vocabulary JSON-LD
 *
 * @example
 * ```ts
 * const vocab = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
 * const nameProp = extractProperty(vocab, 'name')
 * // { name: 'name', description: '...', domainIncludes: ['Thing'], rangeIncludes: ['Text'] }
 * ```
 */
export function extractProperty(
  doc: JsonLDDocument,
  propertyName: string
): SchemaProperty | undefined {
  const graph = doc['@graph']
  if (!graph) return undefined

  // Find the property definition
  const propNode = graph.find((n) => {
    const nodeType = n['@type']
    const label = n['rdfs:label']
    const isProperty = nodeType === 'rdf:Property' ||
      (Array.isArray(nodeType) && nodeType.includes('rdf:Property'))
    return isProperty && label === propertyName
  })

  if (!propNode) return undefined

  // Extract domain and range includes
  const domainIncludes = extractRefs(propNode['schema:domainIncludes'])
  const rangeIncludes = extractRefs(propNode['schema:rangeIncludes'])

  // Extract optional properties
  const subPropertyOf = propNode['rdfs:subPropertyOf']
    ? extractLocalName((propNode['rdfs:subPropertyOf'] as { '@id': string })['@id'])
    : undefined
  const inverseOf = propNode['schema:inverseOf']
    ? extractLocalName((propNode['schema:inverseOf'] as { '@id': string })['@id'])
    : undefined
  const supersededBy = propNode['schema:supersededBy']
    ? extractLocalName((propNode['schema:supersededBy'] as { '@id': string })['@id'])
    : undefined

  return {
    $type: 'Property',
    $id: propNode['@id'] as string || `https://schema.org/${propertyName}`,
    name: propNode['rdfs:label'] as string || propertyName,
    description: propNode['rdfs:comment'] as string || '',
    domainIncludes,
    rangeIncludes,
    subPropertyOf,
    inverseOf,
    supersededBy,
  }
}

/**
 * Extract all properties that have a given type in domainIncludes
 */
export function extractPropertiesForType(
  doc: JsonLDDocument,
  typeName: string
): SchemaProperty[] {
  const graph = doc['@graph']
  if (!graph) return []

  return graph
    .filter((n) => {
      const nodeType = n['@type']
      const isProperty = nodeType === 'rdf:Property' ||
        (Array.isArray(nodeType) && nodeType.includes('rdf:Property'))
      if (!isProperty) return false

      // Check if this type is in domainIncludes
      const domain = n['schema:domainIncludes']
      if (!domain) return false

      const domains = Array.isArray(domain) ? domain : [domain]
      return domains.some((d) => {
        const id = (d as { '@id': string })['@id']
        return id?.endsWith(`/${typeName}`) || extractLocalName(id) === typeName
      })
    })
    .map((n) => ({
      $type: 'Property',
      $id: n['@id'] as string,
      name: n['rdfs:label'] as string || '',
      description: n['rdfs:comment'] as string || '',
      domainIncludes: extractRefs(n['schema:domainIncludes']),
      rangeIncludes: extractRefs(n['schema:rangeIncludes']),
    }))
}

/**
 * Get all types from vocabulary
 */
export function extractAllTypes(doc: JsonLDDocument): SchemaType[] {
  const graph = doc['@graph']
  if (!graph) return []

  return graph
    .filter((n) => {
      const nodeType = n['@type']
      return nodeType === 'rdfs:Class' ||
        (Array.isArray(nodeType) && nodeType.includes('rdfs:Class'))
    })
    .map((n) => {
      const id = n['@id'] as string
      const typeName = extractLocalName(id)
      return {
        $type: 'Class',
        $id: id,
        label: n['rdfs:label'] as string || typeName,
        description: n['rdfs:comment'] as string || '',
        subClassOf: extractRefs(n['rdfs:subClassOf']),
      }
    })
}

/**
 * Get all properties from vocabulary
 */
export function extractAllProperties(doc: JsonLDDocument): SchemaProperty[] {
  const graph = doc['@graph']
  if (!graph) return []

  return graph
    .filter((n) => {
      const nodeType = n['@type']
      return nodeType === 'rdf:Property' ||
        (Array.isArray(nodeType) && nodeType.includes('rdf:Property'))
    })
    .map((n) => ({
      $type: 'Property',
      $id: n['@id'] as string,
      name: n['rdfs:label'] as string || '',
      description: n['rdfs:comment'] as string || '',
      domainIncludes: extractRefs(n['schema:domainIncludes']),
      rangeIncludes: extractRefs(n['schema:rangeIncludes']),
      subPropertyOf: n['rdfs:subPropertyOf']
        ? extractLocalName((n['rdfs:subPropertyOf'] as { '@id': string })['@id'])
        : undefined,
      inverseOf: n['schema:inverseOf']
        ? extractLocalName((n['schema:inverseOf'] as { '@id': string })['@id'])
        : undefined,
      supersededBy: n['schema:supersededBy']
        ? extractLocalName((n['schema:supersededBy'] as { '@id': string })['@id'])
        : undefined,
    }))
}
