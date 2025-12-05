/**
 * Generate Payload collections from MDX files
 *
 * Scans MDX files for $type definitions and generates Payload collections.
 *
 * @example
 * ```ts
 * import { generateCollections } from '@mdxe/payload/generate'
 *
 * const collections = await generateCollections({
 *   source: './content',
 * })
 * ```
 *
 * @packageDocumentation
 */

import { parse } from 'mdxld'
import type { CollectionConfig, Field } from 'payload'
import type {
  GenerateCollectionsOptions,
  TypeDefinition,
  FieldDefinition,
  RelationshipDefinition,
} from './types.js'
import { createVirtualCollection } from '@mdxdb/payload'

// =============================================================================
// Collection Generation
// =============================================================================

/**
 * Generate Payload collections from MDX files
 *
 * @param options - Generation options
 * @returns Array of Payload collection configs
 */
export async function generateCollections(
  options: GenerateCollectionsOptions
): Promise<CollectionConfig[]> {
  const { source, types = [] } = options

  // If types are provided directly, use them
  if (types.length > 0) {
    return types.map(type => typeToCollection(type))
  }

  // Otherwise, scan the source directory
  const discoveredTypes = await discoverTypes(source)

  return discoveredTypes.map(type => typeToCollection(type))
}

/**
 * Discover types from MDX files in a directory
 */
async function discoverTypes(source: string): Promise<TypeDefinition[]> {
  // This would scan the filesystem for MDX files
  // For Workers, we need a different approach (pre-build or dynamic)

  // TODO: Implement filesystem scanning
  // For now, return empty array
  console.warn('Type discovery not implemented for Workers. Provide types explicitly.')
  return []
}

/**
 * Convert a TypeDefinition to a Payload CollectionConfig
 */
function typeToCollection(type: TypeDefinition): CollectionConfig {
  const fields: Field[] = type.fields.map(field => fieldToPayload(field))

  // Add relationship fields
  if (type.relationships) {
    for (const rel of type.relationships) {
      fields.push(relationshipToPayload(rel))
    }
  }

  return createVirtualCollection({
    slug: type.slug,
    type: type.name,
    fields,
  })
}

/**
 * Convert a FieldDefinition to a Payload Field
 */
function fieldToPayload(field: FieldDefinition): Field {
  const base: any = {
    name: field.name,
    type: field.type,
    required: field.required,
    unique: field.unique,
    index: field.index,
    admin: field.admin,
  }

  // Handle relationship fields
  if (field.type === 'relationship') {
    base.relationTo = field.relationTo
    base.hasMany = field.hasMany
  }

  // Handle select fields
  if (field.type === 'select' && field.options) {
    base.options = field.options
  }

  return base as Field
}

/**
 * Convert a RelationshipDefinition to a Payload Field
 */
function relationshipToPayload(rel: RelationshipDefinition): Field {
  return {
    name: rel.name,
    type: 'relationship',
    relationTo: rel.to,
    hasMany: rel.type === 'hasMany' || rel.type === 'belongsToMany',
    admin: {
      description: `${rel.type} relationship to ${rel.to}`,
    },
  } as Field
}

// =============================================================================
// Type Parsing from MDX
// =============================================================================

/**
 * Parse a type definition from an MDX file's frontmatter
 */
export function parseTypeFromMDX(content: string): TypeDefinition | null {
  try {
    const doc = parse(content)

    if (!doc.type) {
      return null
    }

    // Handle type that could be string or string[]
    const rawType = Array.isArray(doc.type) ? doc.type[0] : doc.type
    if (!rawType || typeof rawType !== 'string') {
      return null
    }

    // Extract type name
    const typeName = rawType.replace(/^https?:\/\/schema\.org\//, '')

    // Create slug from type name
    const slug = typeName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/--+/g, '-')

    // Infer fields from data
    const fields: FieldDefinition[] = []

    if (doc.data) {
      for (const [key, value] of Object.entries(doc.data)) {
        // Skip special fields
        if (key.startsWith('$') || key.startsWith('@')) continue

        fields.push(inferField(key, value))
      }
    }

    // Detect relationships from schema.org patterns
    const relationships: RelationshipDefinition[] = []

    if (doc.data) {
      for (const [key, value] of Object.entries(doc.data)) {
        const rel = detectRelationship(key, value, doc.data)
        if (rel) {
          relationships.push(rel)
        }
      }
    }

    // Handle context that could be string, string[], or Record
    let context: string | Record<string, unknown> | undefined
    if (doc.context) {
      if (typeof doc.context === 'string') {
        context = doc.context
      } else if (Array.isArray(doc.context)) {
        context = doc.context[0] as string | undefined
      } else {
        context = doc.context as Record<string, unknown>
      }
    }

    return {
      name: typeName,
      slug,
      fields,
      relationships: relationships.length > 0 ? relationships : undefined,
      context,
    }
  } catch (error) {
    console.error('Error parsing MDX type:', error)
    return null
  }
}

/**
 * Infer a field definition from a key-value pair
 */
function inferField(key: string, value: unknown): FieldDefinition {
  // Determine type from value
  let type: FieldDefinition['type'] = 'text'

  if (value === null || value === undefined) {
    type = 'text'
  } else if (typeof value === 'number') {
    type = 'number'
  } else if (typeof value === 'boolean') {
    type = 'checkbox'
  } else if (value instanceof Date) {
    type = 'date'
  } else if (typeof value === 'string') {
    // Check for date strings
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      type = 'date'
    }
    // Check for long text
    else if (value.length > 200) {
      type = 'textarea'
    } else {
      type = 'text'
    }
  } else if (Array.isArray(value)) {
    type = 'json'
  } else if (typeof value === 'object') {
    type = 'json'
  }

  // Determine if required based on common patterns
  const required = [
    'title',
    'name',
    'slug',
    'id',
    'email',
  ].includes(key.toLowerCase())

  // Determine if unique
  const unique = [
    'slug',
    'email',
    'id',
    'sku',
    'username',
  ].includes(key.toLowerCase())

  return {
    name: key,
    type,
    required,
    unique,
    admin: {
      description: generateFieldDescription(key, type),
    },
  }
}

/**
 * Detect if a field represents a relationship
 */
function detectRelationship(
  key: string,
  value: unknown,
  data: Record<string, unknown>
): RelationshipDefinition | null {
  // Common relationship field patterns
  const relationshipPatterns = [
    /^author$/i,
    /^creator$/i,
    /^owner$/i,
    /^parent$/i,
    /^children$/i,
    /^.*_id$/i,
    /^.*Id$/,
    /^.*Ids$/,
    /^related.*/i,
    /^.*Ref$/i,
    /^.*Refs$/i,
  ]

  const isRelationship = relationshipPatterns.some(pattern => pattern.test(key))

  if (!isRelationship) return null

  // Infer the target type
  let toType = key
    .replace(/Id$/i, '')
    .replace(/Ids$/i, '')
    .replace(/Ref$/i, '')
    .replace(/Refs$/i, '')
    .replace(/^related/i, '')
    .replace(/^(.)/i, c => c.toUpperCase())

  // Handle special cases
  if (/^author$/i.test(key)) toType = 'User'
  if (/^creator$/i.test(key)) toType = 'User'
  if (/^owner$/i.test(key)) toType = 'User'
  if (/^parent$/i.test(key)) toType = data['$type'] as string ?? 'Thing'
  if (/^children$/i.test(key)) toType = data['$type'] as string ?? 'Thing'

  // Determine relationship type
  const isMany = Array.isArray(value) || /s$/i.test(key) || /Ids$/i.test(key)

  return {
    name: key,
    to: toType.toLowerCase() + 's', // Pluralize for collection slug
    type: isMany ? 'hasMany' : 'hasOne',
  }
}

/**
 * Generate a description for a field
 */
function generateFieldDescription(key: string, type: string): string {
  const descriptions: Record<string, string> = {
    title: 'The title of this item',
    name: 'The name of this item',
    description: 'A description of this item',
    content: 'The main content',
    slug: 'URL-safe identifier',
    email: 'Email address',
    url: 'Web URL',
    date: 'Date value',
    price: 'Price value',
    status: 'Current status',
  }

  return descriptions[key.toLowerCase()] ?? `${key} field`
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Process multiple MDX files and generate collections
 */
export async function processContentDirectory(
  files: Array<{ path: string; content: string }>
): Promise<{
  types: TypeDefinition[]
  collections: CollectionConfig[]
  errors: Array<{ path: string; error: string }>
}> {
  const types: TypeDefinition[] = []
  const errors: Array<{ path: string; error: string }> = []
  const typeNames = new Set<string>()

  for (const file of files) {
    try {
      const type = parseTypeFromMDX(file.content)

      if (type && !typeNames.has(type.name)) {
        types.push(type)
        typeNames.add(type.name)
      }
    } catch (error) {
      errors.push({
        path: file.path,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const collections = types.map(type => typeToCollection(type))

  return { types, collections, errors }
}

export { typeToCollection, fieldToPayload, relationshipToPayload }
