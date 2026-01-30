/**
 * Parquet Writer
 *
 * Pure JS parquet writing using hyparquet.
 * Larger bundle (~100KB) - use lazy loading in Snippets.
 *
 * @packageDocumentation
 */

import { parquetWrite } from 'hyparquet'
import type {
  ParquetWriter as IParquetWriter,
  ParquetSchema,
  WriteOptions,
  Thing,
  Relationship,
} from './types.js'
import { thingSchema, relationshipSchema, relationshipIndexSchema, inferSchema } from './schema.js'

/**
 * Convert our schema type to hyparquet schema format
 */
function convertSchemaToHyparquet(schema: ParquetSchema): Record<string, string> {
  const result: Record<string, string> = {}

  for (const field of schema.fields) {
    let type: string

    switch (field.type) {
      case 'BOOLEAN':
        type = 'BOOLEAN'
        break
      case 'INT32':
        type = 'INT32'
        break
      case 'INT64':
        type = 'INT64'
        break
      case 'FLOAT':
        type = 'FLOAT'
        break
      case 'DOUBLE':
        type = 'DOUBLE'
        break
      case 'UTF8':
        type = 'UTF8'
        break
      case 'JSON':
        type = 'UTF8' // JSON stored as UTF8 string
        break
      case 'TIMESTAMP':
        type = 'INT64' // Timestamp as milliseconds
        break
      default:
        type = 'UTF8'
    }

    if (field.optional) {
      type = type + ',OPTIONAL'
    }

    result[field.name] = type
  }

  return result
}

/**
 * Prepare data for writing by converting types
 */
function prepareData<T>(data: T[], schema?: ParquetSchema): Record<string, unknown>[] {
  return data.map((row) => {
    const prepared: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (value === undefined) {
        prepared[key] = null
      } else if (value instanceof Date) {
        prepared[key] = value.toISOString()
      } else if (typeof value === 'object' && value !== null) {
        // JSON fields - stringify objects
        const field = schema?.fields.find((f) => f.name === key)
        if (field?.type === 'JSON' || (typeof value === 'object' && !Array.isArray(value))) {
          prepared[key] = JSON.stringify(value)
        } else {
          prepared[key] = value
        }
      } else {
        prepared[key] = value
      }
    }

    return prepared
  })
}

/**
 * Write data to parquet format
 */
export async function write<T = Record<string, unknown>>(
  data: T[],
  schema?: ParquetSchema,
  options?: WriteOptions
): Promise<ArrayBuffer> {
  if (data.length === 0) {
    // Return empty parquet file
    const emptySchema = schema ?? { fields: [] }
    return parquetWrite({
      schema: convertSchemaToHyparquet(emptySchema),
      data: [],
      compression: options?.compression ?? 'UNCOMPRESSED',
    })
  }

  const inferredSchema = schema ?? inferSchema(data as Record<string, unknown>[])
  const hyparquetSchema = convertSchemaToHyparquet(inferredSchema)
  const preparedData = prepareData(data, inferredSchema)

  return parquetWrite({
    schema: hyparquetSchema,
    data: preparedData,
    compression: options?.compression ?? 'UNCOMPRESSED',
    rowGroupSize: options?.rowGroupSize,
    pageSize: options?.pageSize,
    keyValueMetadata: options?.keyValueMetadata,
  })
}

/**
 * Convert Thing to parquet row format
 */
function thingToRow<TData>(thing: Thing<TData>): Record<string, unknown> {
  return {
    url: thing.url,
    type: thing.type,
    id: thing.id,
    data: JSON.stringify(thing.data),
    content: thing.content ?? null,
    context: thing['@context'] ? JSON.stringify(thing['@context']) : null,
    at: thing.at.toISOString(),
    by: thing.by ?? null,
    in: thing.in ?? null,
    version: thing.version,
  }
}

/**
 * Convert Relationship to parquet row format
 */
function relationshipToRow<TData>(rel: Relationship<TData>): Record<string, unknown> {
  return {
    id: rel.id,
    predicate: rel.predicate,
    reverse: rel.reverse ?? null,
    from: rel.from,
    to: rel.to,
    data: rel.data ? JSON.stringify(rel.data) : null,
    at: rel.at.toISOString(),
    by: rel.by ?? null,
    in: rel.in ?? null,
    do: rel.do ?? null,
  }
}

/**
 * Convert Relationship to bidirectional index rows
 * Returns two rows - one for forward lookup, one for reverse
 */
function relationshipToIndexRows<TData>(rel: Relationship<TData>): Record<string, unknown>[] {
  const base = {
    id: rel.id,
    predicate: rel.predicate,
    reverse: rel.reverse ?? null,
    from: rel.from,
    to: rel.to,
    data: rel.data ? JSON.stringify(rel.data) : null,
    at: rel.at.toISOString(),
    by: rel.by ?? null,
    in: rel.in ?? null,
    do: rel.do ?? null,
  }

  const rows: Record<string, unknown>[] = []

  // Forward: lookup by from + predicate
  rows.push({
    ...base,
    lookup_key: `${rel.from}:${rel.predicate}`,
    direction: 'forward',
  })

  // Reverse: lookup by to + reverse (if reverse is defined)
  if (rel.reverse) {
    rows.push({
      ...base,
      lookup_key: `${rel.to}:${rel.reverse}`,
      direction: 'reverse',
    })
  }

  return rows
}

/**
 * Write Thing entities to parquet
 */
export async function writeThings(things: Thing[], options?: WriteOptions): Promise<ArrayBuffer> {
  const rows = things.map((t) => thingToRow(t))
  return write(rows, thingSchema(), options)
}

/**
 * Write Relationship entities to parquet
 */
export async function writeRelationships(
  relationships: Relationship[],
  options?: WriteOptions
): Promise<ArrayBuffer> {
  const rows = relationships.map((r) => relationshipToRow(r))
  return write(rows, relationshipSchema(), options)
}

/**
 * Write Relationship entities to parquet with bidirectional indexing
 * Each relationship is stored twice - once per direction
 * Sorted by lookup_key for efficient queries from any ID
 */
export async function writeRelationshipsIndexed(
  relationships: Relationship[],
  options?: WriteOptions
): Promise<ArrayBuffer> {
  // Flatten to index rows (each rel becomes 1-2 rows)
  const rows = relationships.flatMap((r) => relationshipToIndexRows(r))

  // Sort by lookup_key for efficient binary search
  rows.sort((a, b) => {
    const keyA = a.lookup_key as string
    const keyB = b.lookup_key as string
    return keyA.localeCompare(keyB)
  })

  return write(rows, relationshipIndexSchema(), options)
}

/**
 * Create a ParquetWriter instance
 */
export function createWriter(): IParquetWriter {
  return {
    write,
    writeThings,
    writeRelationships,
  }
}

export { write as parquetWrite, writeThings, writeRelationships }
