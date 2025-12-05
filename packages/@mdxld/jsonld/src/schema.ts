/**
 * Schema.org vocabulary conversion
 *
 * Converts JSON-LD vocabulary into MDXLD Things + Relationships structure.
 * Instead of extracting one type/property at a time, convert the whole
 * vocabulary and query it as needed.
 */

import { fromJsonLD } from './convert.js'
import { extractLocalName, extractRefs } from './utils.js'
import type { JsonLDDocument, JsonLDNode, MDXLDNode, ConversionOptions } from './types.js'

/**
 * Source of a vocabulary item
 * - 'base': From base vocabulary (e.g., schema.org), can be regenerated
 * - 'extension': Custom extension, should be preserved
 */
export type VocabularySource = 'base' | 'extension'

/**
 * A Thing in the vocabulary (type/class definition)
 */
export interface Thing {
  $type: 'Class'
  $id: string
  name: string
  description: string
  subClassOf?: string[]
  /** Source of this type definition */
  $source?: VocabularySource
}

/**
 * A Relationship definition in the vocabulary (property)
 * Defines what edges can exist between Things
 */
export interface RelationshipDef {
  $type: 'Property'
  $id: string
  name: string
  description: string
  /** Source types (what Things can have this relationship) */
  from: string[]
  /** Target types (what Things this can point to) */
  to: string[]
  /** Parent property */
  subPropertyOf?: string
  /** Inverse relationship name */
  inverseOf?: string
  /** Deprecated in favor of */
  supersededBy?: string
  /** Source of this property definition */
  $source?: VocabularySource
}

/**
 * Complete vocabulary as Things + Relationships
 */
export interface Vocabulary {
  $context: string
  /** All type definitions indexed by name */
  things: Map<string, Thing>
  /** All property/relationship definitions indexed by name */
  relationships: Map<string, RelationshipDef>
}

/**
 * Extended vocabulary that combines a base vocabulary with extensions
 * Used for creating supersets like schema.org.ai extending schema.org
 */
export interface ExtendedVocabulary extends Vocabulary {
  /** Base vocabulary context (e.g., 'https://schema.org') */
  baseContext: string
  /** Extension vocabulary context (e.g., 'https://schema.org.ai') */
  extensionContext: string
}

/**
 * Options for extending a vocabulary
 */
export interface ExtendVocabularyOptions {
  /** Context URL for the base vocabulary */
  baseContext?: string
  /** Context URL for the extension vocabulary */
  extensionContext?: string
  /**
   * How to handle conflicts when both base and extension define the same type/property
   * - 'extension-wins': Extension definition replaces base (default)
   * - 'base-wins': Base definition is preserved
   * - 'merge': Merge descriptions, combine arrays
   */
  conflictStrategy?: 'extension-wins' | 'base-wins' | 'merge'
}

/**
 * Schema.org type definition (legacy - use Thing instead)
 * @deprecated Use Thing interface instead
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
 * Schema.org property definition (legacy - use RelationshipDef instead)
 * @deprecated Use RelationshipDef interface instead
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
 * Convert a JSON-LD vocabulary to MDXLD Things + Relationships
 *
 * @example
 * ```ts
 * const vocab = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
 * const { things, relationships } = toVocabulary(await vocab.json())
 *
 * // Get a specific type
 * const person = things.get('Person')
 * // { $type: 'Class', name: 'Person', subClassOf: ['Thing'], ... }
 *
 * // Get a specific relationship
 * const knows = relationships.get('knows')
 * // { $type: 'Property', name: 'knows', from: ['Person'], to: ['Person'], ... }
 *
 * // Find all relationships for a type
 * const personRelationships = [...relationships.values()]
 *   .filter(r => r.from.includes('Person'))
 * ```
 */
export function toVocabulary(doc: JsonLDDocument): Vocabulary {
  const graph = doc['@graph'] || []
  const context = (doc['@context'] as string) || 'https://schema.org'

  const things = new Map<string, Thing>()
  const relationships = new Map<string, RelationshipDef>()

  for (const node of graph) {
    const nodeType = node['@type']
    const isClass = nodeType === 'rdfs:Class' ||
      (Array.isArray(nodeType) && nodeType.includes('rdfs:Class'))
    const isProperty = nodeType === 'rdf:Property' ||
      (Array.isArray(nodeType) && nodeType.includes('rdf:Property'))

    if (isClass) {
      const id = node['@id'] as string
      const name = extractLocalName(id)
      const subClassOf = extractRefs(node['rdfs:subClassOf'])

      things.set(name, {
        $type: 'Class',
        $id: id,
        name,
        description: (node['rdfs:comment'] as string) || '',
        subClassOf: subClassOf.length > 0 ? subClassOf : undefined,
      })
    }

    if (isProperty) {
      const id = node['@id'] as string
      const name = (node['rdfs:label'] as string) || extractLocalName(id)
      const from = extractRefs(node['schema:domainIncludes'])
      const to = extractRefs(node['schema:rangeIncludes'])

      relationships.set(name, {
        $type: 'Property',
        $id: id,
        name,
        description: (node['rdfs:comment'] as string) || '',
        from,
        to,
        subPropertyOf: node['rdfs:subPropertyOf']
          ? extractLocalName((node['rdfs:subPropertyOf'] as { '@id': string })['@id'])
          : undefined,
        inverseOf: node['schema:inverseOf']
          ? extractLocalName((node['schema:inverseOf'] as { '@id': string })['@id'])
          : undefined,
        supersededBy: node['schema:supersededBy']
          ? extractLocalName((node['schema:supersededBy'] as { '@id': string })['@id'])
          : undefined,
      })
    }
  }

  return { $context: context, things, relationships }
}

/**
 * Get all relationships that can originate from a Thing type
 */
export function relationshipsFrom(vocab: Vocabulary, typeName: string): RelationshipDef[] {
  return [...vocab.relationships.values()].filter(r => r.from.includes(typeName))
}

/**
 * Get all relationships that can target a Thing type
 */
export function relationshipsTo(vocab: Vocabulary, typeName: string): RelationshipDef[] {
  return [...vocab.relationships.values()].filter(r => r.to.includes(typeName))
}

/**
 * Get the type hierarchy (all ancestors) for a Thing
 */
export function typeHierarchy(vocab: Vocabulary, typeName: string): string[] {
  const result: string[] = []
  let current = vocab.things.get(typeName)

  while (current?.subClassOf) {
    for (const parent of current.subClassOf) {
      if (!result.includes(parent)) {
        result.push(parent)
      }
      current = vocab.things.get(parent)
    }
  }

  return result
}

/**
 * Get all relationships for a type including inherited ones
 */
export function allRelationshipsFor(vocab: Vocabulary, typeName: string): RelationshipDef[] {
  const types = [typeName, ...typeHierarchy(vocab, typeName)]
  const seen = new Set<string>()
  const result: RelationshipDef[] = []

  for (const type of types) {
    for (const rel of relationshipsFrom(vocab, type)) {
      if (!seen.has(rel.name)) {
        seen.add(rel.name)
        result.push(rel)
      }
    }
  }

  return result
}

/**
 * Get all types that inherit from a given type (descendants)
 * Reverse of typeHierarchy - finds all children instead of parents
 */
export function typeDescendants(vocab: Vocabulary, typeName: string): string[] {
  const result: string[] = []

  for (const [name, thing] of vocab.things) {
    if (thing.subClassOf?.includes(typeName)) {
      result.push(name)
      // Recursively get descendants of this type
      result.push(...typeDescendants(vocab, name))
    }
  }

  return [...new Set(result)] // Remove duplicates
}

/**
 * Get all types that have a property (direct domain + types that inherit from those)
 */
export function typesForProperty(vocab: Vocabulary, propertyName: string): string[] {
  const rel = vocab.relationships.get(propertyName)
  if (!rel) return []

  const result = new Set<string>()

  // Add direct domain types
  for (const type of rel.from) {
    result.add(type)
    // Add all descendants of this type
    for (const descendant of typeDescendants(vocab, type)) {
      result.add(descendant)
    }
  }

  return [...result]
}

/**
 * Get all properties for a type (direct + inherited from ancestors)
 * Returns properties grouped by where they come from
 */
export function propertiesForType(vocab: Vocabulary, typeName: string): {
  direct: RelationshipDef[]
  inherited: { type: string; properties: RelationshipDef[] }[]
} {
  const direct = relationshipsFrom(vocab, typeName)
  const hierarchy = typeHierarchy(vocab, typeName)

  const inherited: { type: string; properties: RelationshipDef[] }[] = []
  const seenProps = new Set(direct.map(p => p.name))

  for (const ancestor of hierarchy) {
    const ancestorProps = relationshipsFrom(vocab, ancestor)
      .filter(p => !seenProps.has(p.name))

    if (ancestorProps.length > 0) {
      inherited.push({ type: ancestor, properties: ancestorProps })
      ancestorProps.forEach(p => seenProps.add(p.name))
    }
  }

  return { direct, inherited }
}

/**
 * Extend a base vocabulary with custom types and properties
 *
 * Creates a superset vocabulary where:
 * - All base types/properties are included with $source: 'base'
 * - All extension types/properties are added with $source: 'extension'
 * - Extension types can subClassOf base types and inherit their properties
 * - Extension properties can target base types (domainIncludes)
 *
 * @example
 * ```ts
 * // Load base schema.org vocabulary
 * const schemaOrg = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
 * const base = toVocabulary(await schemaOrg.json())
 *
 * // Load custom extensions
 * const extensions = toVocabulary(extensionsJsonLd)
 *
 * // Create superset
 * const vocab = extendVocabulary(base, extensions, {
 *   baseContext: 'https://schema.org',
 *   extensionContext: 'https://schema.org.ai',
 * })
 *
 * // Extension types inherit from base
 * const agent = vocab.things.get('Agent')
 * // { $source: 'extension', subClassOf: ['Thing'], ... }
 *
 * // Extension properties on base types
 * const digital = vocab.relationships.get('digital')
 * // { $source: 'extension', from: ['Thing'], ... }
 * ```
 */
export function extendVocabulary(
  base: Vocabulary,
  extensions: Vocabulary,
  options: ExtendVocabularyOptions = {}
): ExtendedVocabulary {
  const {
    baseContext = base.$context,
    extensionContext = extensions.$context,
    conflictStrategy = 'extension-wins',
  } = options

  const things = new Map<string, Thing>()
  const relationships = new Map<string, RelationshipDef>()

  // Add all base types with $source: 'base'
  for (const [name, thing] of base.things) {
    things.set(name, { ...thing, $source: 'base' })
  }

  // Add all extension types with $source: 'extension'
  for (const [name, thing] of extensions.things) {
    const existing = things.get(name)

    if (existing) {
      // Handle conflict
      switch (conflictStrategy) {
        case 'base-wins':
          // Keep base, don't add extension
          break
        case 'merge':
          // Merge descriptions, keep extension's structure
          things.set(name, {
            ...thing,
            $source: 'extension',
            description: thing.description || existing.description,
          })
          break
        case 'extension-wins':
        default:
          // Replace with extension
          things.set(name, { ...thing, $source: 'extension' })
          break
      }
    } else {
      // New type from extension
      things.set(name, { ...thing, $source: 'extension' })
    }
  }

  // Add all base relationships with $source: 'base'
  for (const [name, rel] of base.relationships) {
    relationships.set(name, { ...rel, $source: 'base' })
  }

  // Add all extension relationships with $source: 'extension'
  for (const [name, rel] of extensions.relationships) {
    const existing = relationships.get(name)

    if (existing) {
      // Handle conflict
      switch (conflictStrategy) {
        case 'base-wins':
          // Keep base, but merge domain/range if extension adds new types
          relationships.set(name, {
            ...existing,
            from: [...new Set([...existing.from, ...rel.from])],
            to: [...new Set([...existing.to, ...rel.to])],
          })
          break
        case 'merge':
          // Merge everything
          relationships.set(name, {
            ...rel,
            $source: 'extension',
            description: rel.description || existing.description,
            from: [...new Set([...existing.from, ...rel.from])],
            to: [...new Set([...existing.to, ...rel.to])],
          })
          break
        case 'extension-wins':
        default:
          // Replace with extension but preserve expanded domain/range
          relationships.set(name, {
            ...rel,
            $source: 'extension',
            from: [...new Set([...existing.from, ...rel.from])],
            to: [...new Set([...existing.to, ...rel.to])],
          })
          break
      }
    } else {
      // New relationship from extension
      relationships.set(name, { ...rel, $source: 'extension' })
    }
  }

  return {
    $context: extensionContext,
    baseContext,
    extensionContext,
    things,
    relationships,
  }
}

/**
 * Filter vocabulary items by source
 *
 * @example
 * ```ts
 * const extended = extendVocabulary(base, extensions)
 *
 * // Get only extension types (for preserving during regeneration)
 * const extensionTypes = filterBySource(extended, 'extension')
 *
 * // Get only base types (for regeneration)
 * const baseTypes = filterBySource(extended, 'base')
 * ```
 */
export function filterBySource(
  vocab: Vocabulary,
  source: VocabularySource
): { things: Thing[]; relationships: RelationshipDef[] } {
  const things = [...vocab.things.values()].filter(t => t.$source === source)
  const relationships = [...vocab.relationships.values()].filter(r => r.$source === source)
  return { things, relationships }
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
