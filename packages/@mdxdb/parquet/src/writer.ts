/**
 * Parquet Writer
 *
 * Pure JS parquet writing using hyparquet-writer.
 * Larger bundle (~100KB) - use lazy loading in Snippets.
 *
 * @packageDocumentation
 */

import { parquetWriteBuffer } from 'hyparquet-writer'
import type { ColumnSource, BasicType } from 'hyparquet-writer'
import type {
  ParquetWriter as IParquetWriter,
  ParquetSchema,
  WriteOptions,
  Thing,
  Relationship,
} from './types.js'
import { thingSchema, relationshipSchema, relationshipIndexSchema, inferSchema } from './schema.js'

/**
 * Convert our field type to hyparquet BasicType
 */
function convertType(type: string): BasicType {
  switch (type) {
    case 'BOOLEAN':
      return 'BOOLEAN'
    case 'INT32':
      return 'INT32'
    case 'INT64':
      return 'INT64'
    case 'FLOAT':
      return 'FLOAT'
    case 'DOUBLE':
      return 'DOUBLE'
    case 'UTF8':
    case 'JSON':
      return 'STRING'
    case 'TIMESTAMP':
      return 'TIMESTAMP'
    default:
      return 'STRING'
  }
}

/**
 * Convert rows to columnData format for hyparquet-writer
 */
function rowsToColumnData(
  rows: Record<string, unknown>[],
  schema: ParquetSchema
): ColumnSource[] {
  if (rows.length === 0) {
    return schema.fields.map((field) => ({
      name: field.name,
      data: [],
      type: convertType(field.type),
      nullable: field.optional ?? true,
    }))
  }

  return schema.fields.map((field) => {
    const values = rows.map((row) => {
      const value = row[field.name]

      // Handle null/undefined
      if (value === null || value === undefined) {
        return null
      }

      // Handle JSON fields
      if (field.type === 'JSON' && typeof value === 'object') {
        return JSON.stringify(value)
      }

      // Handle Date to ISO string for timestamps
      if (value instanceof Date) {
        return value.toISOString()
      }

      return value
    })

    return {
      name: field.name,
      data: values,
      type: convertType(field.type),
      nullable: field.optional ?? true,
    }
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
  // Infer schema if not provided
  const finalSchema = schema ?? inferSchema(data as Record<string, unknown>[])

  // Convert to column data format
  const columnData = rowsToColumnData(data as Record<string, unknown>[], finalSchema)

  // Convert keyValueMetadata from Record to KeyValue array
  const kvMetadata = options?.keyValueMetadata
    ? Object.entries(options.keyValueMetadata).map(([key, value]) => ({ key, value }))
    : undefined

  // Write to buffer
  return parquetWriteBuffer({
    columnData,
    codec: options?.compression === 'UNCOMPRESSED' ? 'UNCOMPRESSED' : options?.compression ?? 'UNCOMPRESSED',
    rowGroupSize: options?.rowGroupSize,
    pageSize: options?.pageSize,
    kvMetadata,
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
    at: thing.at,
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
    at: rel.at,
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
    at: rel.at,
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

// Re-export write as parquetWrite for backwards compatibility
export { write as parquetWrite }
