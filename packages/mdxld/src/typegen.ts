/**
 * MDXLD Type Generation
 *
 * Generate TypeScript type definitions from MDXLD documents.
 * Scans frontmatter to infer types and creates .d.ts files.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from './types.js'

/**
 * TypeScript type representation
 */
export type TSType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'unknown'
  | 'string[]'
  | 'number[]'
  | 'boolean[]'
  | 'unknown[]'
  | { kind: 'object'; properties: Record<string, TSType> }
  | { kind: 'union'; types: TSType[] }
  | { kind: 'array'; items: TSType }

/**
 * Inferred field with type and metadata
 */
export interface InferredField {
  name: string
  type: TSType
  optional: boolean
  description?: string
}

/**
 * Inferred schema for a document type
 */
export interface InferredSchema {
  name: string
  fields: InferredField[]
  description?: string
}

/**
 * Options for type generation
 */
export interface TypegenOptions {
  /** Include JSDoc comments */
  jsdoc?: boolean
  /** Export format: 'interface' | 'type' */
  format?: 'interface' | 'type'
  /** Base interface to extend */
  extends?: string
  /** Add index signature for additional properties */
  indexSignature?: boolean
}

/**
 * Infer TypeScript type from a JavaScript value
 */
export function inferType(value: unknown): TSType {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value

  if (type === 'string') return 'string'
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'

    // Infer array item type from all elements
    const itemTypes = value.map(inferType)
    const uniqueTypes = dedupeTypes(itemTypes)

    if (uniqueTypes.length === 1) {
      return { kind: 'array', items: uniqueTypes[0]! }
    }

    return { kind: 'array', items: { kind: 'union', types: uniqueTypes } }
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>
    const properties: Record<string, TSType> = {}

    for (const [key, val] of Object.entries(obj)) {
      properties[key] = inferType(val)
    }

    return { kind: 'object', properties }
  }

  return 'unknown'
}

/**
 * Merge two types into a union or combined type
 */
export function mergeTypes(a: TSType, b: TSType): TSType {
  // Same type
  if (typeEquals(a, b)) return a

  // Handle nullability
  if (a === 'null' || a === 'undefined') {
    return { kind: 'union', types: [b, a] }
  }
  if (b === 'null' || b === 'undefined') {
    return { kind: 'union', types: [a, b] }
  }

  // Merge objects with same structure
  if (
    typeof a === 'object' &&
    a.kind === 'object' &&
    typeof b === 'object' &&
    b.kind === 'object'
  ) {
    const properties: Record<string, TSType> = { ...a.properties }

    for (const [key, type] of Object.entries(b.properties)) {
      if (key in properties) {
        properties[key] = mergeTypes(properties[key]!, type)
      } else {
        // Field only in b, make it optional via union with undefined
        properties[key] = { kind: 'union', types: [type, 'undefined'] }
      }
    }

    // Fields only in a should also be optional
    for (const key of Object.keys(a.properties)) {
      if (!(key in b.properties)) {
        properties[key] = { kind: 'union', types: [a.properties[key]!, 'undefined'] }
      }
    }

    return { kind: 'object', properties }
  }

  // Merge arrays
  if (
    typeof a === 'object' &&
    a.kind === 'array' &&
    typeof b === 'object' &&
    b.kind === 'array'
  ) {
    return { kind: 'array', items: mergeTypes(a.items, b.items) }
  }

  // Create union
  const aTypes = typeof a === 'object' && a.kind === 'union' ? a.types : [a]
  const bTypes = typeof b === 'object' && b.kind === 'union' ? b.types : [b]

  return { kind: 'union', types: dedupeTypes([...aTypes, ...bTypes]) }
}

/**
 * Check if two types are equal
 */
function typeEquals(a: TSType, b: TSType): boolean {
  if (typeof a === 'string' && typeof b === 'string') return a === b
  if (typeof a === 'string' || typeof b === 'string') return false

  if (a.kind !== b.kind) return false

  if (a.kind === 'union' && b.kind === 'union') {
    if (a.types.length !== b.types.length) return false
    return a.types.every((t, i) => typeEquals(t, b.types[i]!))
  }

  if (a.kind === 'array' && b.kind === 'array') {
    return typeEquals(a.items, b.items)
  }

  if (a.kind === 'object' && b.kind === 'object') {
    const aKeys = Object.keys(a.properties).sort()
    const bKeys = Object.keys(b.properties).sort()
    if (aKeys.length !== bKeys.length) return false
    if (!aKeys.every((k, i) => k === bKeys[i])) return false
    return aKeys.every((k) => typeEquals(a.properties[k]!, b.properties[k]!))
  }

  return false
}

/**
 * Deduplicate types array
 */
function dedupeTypes(types: TSType[]): TSType[] {
  const result: TSType[] = []
  for (const type of types) {
    if (!result.some((t) => typeEquals(t, type))) {
      result.push(type)
    }
  }
  return result
}

/**
 * Convert TSType to TypeScript string
 */
export function typeToString(type: TSType): string {
  if (typeof type === 'string') return type

  if (type.kind === 'union') {
    const types = type.types.map(typeToString)
    // Handle optional (T | undefined) specially
    if (types.includes('undefined')) {
      const nonUndefined = types.filter((t) => t !== 'undefined')
      if (nonUndefined.length === 1) {
        return `${nonUndefined[0]} | undefined`
      }
    }
    return types.join(' | ')
  }

  if (type.kind === 'array') {
    const items = typeToString(type.items)
    // Wrap complex types in parens
    if (items.includes('|') || items.includes('&')) {
      return `(${items})[]`
    }
    return `${items}[]`
  }

  if (type.kind === 'object') {
    const props = Object.entries(type.properties)
      .map(([key, t]) => {
        const optional = typeof t === 'object' && t.kind === 'union' && t.types.includes('undefined')
        const cleanType = optional && typeof t === 'object' && t.kind === 'union'
          ? { kind: 'union' as const, types: t.types.filter((x) => x !== 'undefined') }
          : t
        const typeStr = typeof cleanType === 'object' && cleanType.kind === 'union' && cleanType.types.length === 1
          ? typeToString(cleanType.types[0]!)
          : typeToString(cleanType)
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`
        return `${safeKey}${optional ? '?' : ''}: ${typeStr}`
      })
      .join('; ')
    return `{ ${props} }`
  }

  return 'unknown'
}

/**
 * Infer schema from a single document
 */
export function inferSchemaFromDocument(doc: MDXLDDocument): InferredSchema {
  const typeName = getTypeName(doc)
  const fields: InferredField[] = []

  // Add id, type, context if present
  if (doc.id !== undefined) {
    fields.push({ name: '$id', type: 'string', optional: true })
  }
  if (doc.type !== undefined) {
    const typeType = Array.isArray(doc.type) ? 'string[]' : 'string'
    fields.push({ name: '$type', type: typeType as TSType, optional: true })
  }
  if (doc.context !== undefined) {
    fields.push({ name: '$context', type: inferType(doc.context), optional: true })
  }

  // Infer from data fields
  for (const [key, value] of Object.entries(doc.data)) {
    if (key.startsWith('$')) continue // Skip LD properties already handled
    fields.push({
      name: key,
      type: inferType(value),
      optional: false,
    })
  }

  return { name: typeName, fields }
}

/**
 * Get type name from document
 */
function getTypeName(doc: MDXLDDocument): string {
  const type = doc.type ?? doc.data.$type
  if (typeof type === 'string') {
    return sanitizeTypeName(type)
  }
  if (Array.isArray(type) && type.length > 0) {
    return sanitizeTypeName(type[0]!)
  }
  return 'MDXDocument'
}

/**
 * Sanitize a string to be a valid TypeScript identifier
 */
function sanitizeTypeName(name: string): string {
  // Remove URL parts if it's a full URL
  const lastSegment = name.split('/').pop() || name
  // Remove non-alphanumeric chars, ensure starts with letter
  let sanitized = lastSegment.replace(/[^a-zA-Z0-9_]/g, '')
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = 'Type' + sanitized
  }
  // PascalCase
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
}

/**
 * Merge multiple schemas of the same type
 */
export function mergeSchemas(schemas: InferredSchema[]): InferredSchema {
  if (schemas.length === 0) {
    return { name: 'MDXDocument', fields: [] }
  }

  if (schemas.length === 1) {
    return schemas[0]!
  }

  const name = schemas[0]!.name
  const fieldMap = new Map<string, { type: TSType; count: number }>()
  const totalDocs = schemas.length

  for (const schema of schemas) {
    for (const field of schema.fields) {
      const existing = fieldMap.get(field.name)
      if (existing) {
        fieldMap.set(field.name, {
          type: mergeTypes(existing.type, field.type),
          count: existing.count + 1,
        })
      } else {
        fieldMap.set(field.name, { type: field.type, count: 1 })
      }
    }
  }

  const fields: InferredField[] = []
  for (const [name, { type, count }] of fieldMap) {
    fields.push({
      name,
      type,
      optional: count < totalDocs, // Optional if not in all documents
    })
  }

  return { name, fields }
}

/**
 * Generate TypeScript interface from schema
 */
export function generateInterface(
  schema: InferredSchema,
  options: TypegenOptions = {}
): string {
  const { format = 'interface', extends: baseType, indexSignature = false, jsdoc = true } = options

  const lines: string[] = []

  // JSDoc comment
  if (jsdoc && schema.description) {
    lines.push(`/**`)
    lines.push(` * ${schema.description}`)
    lines.push(` */`)
  }

  // Interface declaration
  const extendsClause = baseType ? ` extends ${baseType}` : ''

  if (format === 'interface') {
    lines.push(`export interface ${schema.name}${extendsClause} {`)
  } else {
    lines.push(`export type ${schema.name} = ${baseType ? `${baseType} & ` : ''}{`)
  }

  // Fields
  for (const field of schema.fields) {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field.name) ? field.name : `'${field.name}'`
    const optional = field.optional ? '?' : ''
    const typeStr = typeToString(field.type)
    lines.push(`  ${safeKey}${optional}: ${typeStr}`)
  }

  // Index signature
  if (indexSignature) {
    lines.push(`  [key: string]: unknown`)
  }

  lines.push(`}`)

  return lines.join('\n')
}

/**
 * Generate TypeScript types from multiple documents
 */
export function generateTypes(
  docs: MDXLDDocument[],
  options: TypegenOptions = {}
): string {
  // Group documents by type
  const byType = new Map<string, MDXLDDocument[]>()

  for (const doc of docs) {
    const typeName = getTypeName(doc)
    const existing = byType.get(typeName) || []
    existing.push(doc)
    byType.set(typeName, existing)
  }

  // Generate schema for each type
  const schemas: InferredSchema[] = []

  for (const [, typeDocs] of byType) {
    const docSchemas = typeDocs.map(inferSchemaFromDocument)
    schemas.push(mergeSchemas(docSchemas))
  }

  // Generate output
  const lines: string[] = [
    '/**',
    ' * Auto-generated TypeScript types from MDXLD documents',
    ' * Generated by: mdxld typegen',
    ' * ',
    ' * DO NOT EDIT MANUALLY',
    ' */',
    '',
    "import type { MDXLDDocument } from 'mdxld'",
    '',
  ]

  // Generate interfaces
  for (const schema of schemas) {
    lines.push(generateInterface(schema, options))
    lines.push('')
  }

  // Generate union type of all document types
  if (schemas.length > 1) {
    const typeNames = schemas.map((s) => s.name)
    lines.push(`/** Union of all document types */`)
    lines.push(`export type AnyDocument = ${typeNames.join(' | ')}`)
    lines.push('')
  }

  // Generate typed document helpers
  for (const schema of schemas) {
    lines.push(`/** ${schema.name} document with content */`)
    lines.push(`export type ${schema.name}Document = MDXLDDocument & { data: ${schema.name} }`)
    lines.push('')
  }

  return lines.join('\n')
}
