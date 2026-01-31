/**
 * Parquet Reader
 *
 * Pure JS parquet reading using hyparquet.
 * Optimized for Cloudflare Workers and Snippets (~10KB).
 *
 * @packageDocumentation
 */

import { parquetMetadata, parquetRead } from 'hyparquet'
import type {
  ParquetMetadata,
  ParquetColumnMetadata,
  ParquetSchemaElement,
  ParquetReader as IParquetReader,
  ReadOptions,
  AsyncBuffer,
  AsyncBufferOptions,
  Thing,
  Relationship,
  ThingsParquetData,
  RelationshipsParquetData,
} from './types.js'

/**
 * Create an AsyncBuffer for HTTP range requests
 * Useful for reading parquet metadata without downloading entire file
 */
export function createAsyncBuffer(url: string, options: AsyncBufferOptions): AsyncBuffer {
  const fetchFn = options.fetch ?? fetch

  return {
    byteLength: options.byteLength,
    async slice(start: number, end?: number): Promise<ArrayBuffer> {
      const headers: Record<string, string> = {}
      if (end !== undefined) {
        headers['Range'] = `bytes=${start}-${end - 1}`
      } else {
        headers['Range'] = `bytes=${start}-`
      }

      const response = await fetchFn(url, { headers })
      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      return response.arrayBuffer()
    },
  }
}

/**
 * Convert hyparquet metadata to our interface
 */
function convertMetadata(meta: Awaited<ReturnType<typeof parquetMetadata>>): ParquetMetadata {
  // FileMetaData is returned directly from parquetMetadata
  const fileMetadata = meta as unknown as Record<string, unknown>

  const numRows = (fileMetadata.num_rows as number) ?? 0

  // Extract row groups
  const rowGroups = (fileMetadata.row_groups as unknown[]) ?? []
  const numRowGroups = rowGroups.length

  // Extract schema elements
  const schemaElements = (fileMetadata.schema as Record<string, unknown>[]) ?? []
  const schema: ParquetSchemaElement[] = schemaElements.map((elem) => ({
    name: (elem.name as string) ?? 'unknown',
    type: elem.type as ParquetSchemaElement['type'],
    typeLength: elem.type_length as number | undefined,
    repetitionType: elem.repetition_type as ParquetSchemaElement['repetitionType'],
    convertedType: elem.converted_type as string | undefined,
    numChildren: elem.num_children as number | undefined,
  }))

  // Extract column metadata from row groups
  const columns: ParquetColumnMetadata[] = []
  if (rowGroups.length > 0) {
    const firstRowGroup = rowGroups[0] as { columns?: unknown[] }
    const columnChunks = firstRowGroup.columns ?? []

    for (const chunk of columnChunks) {
      const colMeta = (chunk as { meta_data?: Record<string, unknown> }).meta_data
      if (colMeta) {
        columns.push({
          name: (colMeta.path_in_schema as string[])?.[0] ?? 'unknown',
          type: colMeta.type as ParquetColumnMetadata['type'],
          numValues: colMeta.num_values as number | undefined,
          encodings: colMeta.encodings as string[] | undefined,
          pathInSchema: colMeta.path_in_schema as string[] | undefined,
          codec: colMeta.codec as string | undefined,
        })
      }
    }
  }

  // Extract key-value metadata
  const keyValueMetadata: Record<string, string> = {}
  const kvList = (fileMetadata as { key_value_metadata?: Array<{ key: string; value: string }> }).key_value_metadata ?? []
  for (const kv of kvList) {
    if (kv.key && kv.value) {
      keyValueMetadata[kv.key] = kv.value
    }
  }

  const createdBy = (fileMetadata as { created_by?: string }).created_by

  return {
    numRows,
    numRowGroups,
    columns,
    schema,
    keyValueMetadata: Object.keys(keyValueMetadata).length > 0 ? keyValueMetadata : undefined,
    createdBy,
  }
}

/**
 * Read parquet metadata
 * Optimized for minimal data transfer - only reads file header/footer
 */
export async function metadata(file: ArrayBuffer | AsyncBuffer): Promise<ParquetMetadata> {
  const meta = await parquetMetadata(file as ArrayBuffer)
  return convertMetadata(meta)
}

/**
 * Read all rows from parquet file
 */
export async function read<T = Record<string, unknown>>(
  file: ArrayBuffer | AsyncBuffer,
  options?: ReadOptions
): Promise<T[]> {
  const results: T[] = []

  await parquetRead({
    file,
    columns: options?.columns,
    rowStart: options?.rowStart,
    rowEnd: options?.rowEnd,
    rowFormat: 'object',
    onComplete: (rows) => {
      results.push(...(rows as T[]))
    },
  })

  return results
}

/**
 * Stream rows from parquet file using async generator
 * Reads in batches based on rowStart/rowEnd
 */
export async function* stream<T = Record<string, unknown>>(
  file: ArrayBuffer | AsyncBuffer,
  options?: ReadOptions
): AsyncIterable<T> {
  const meta = await metadata(file)
  const batchSize = 1000 // Read in batches for memory efficiency
  const totalRows = meta.numRows

  for (let start = options?.rowStart ?? 0; start < totalRows; start += batchSize) {
    const end = Math.min(start + batchSize, options?.rowEnd ?? totalRows)

    const rows: T[] = []
    await parquetRead({
      file,
      columns: options?.columns,
      rowStart: start,
      rowEnd: end,
      rowFormat: 'object',
      onComplete: (data) => {
        rows.push(...(data as T[]))
      },
    })

    for (const row of rows) {
      yield row
    }

    // Stop if we've reached the requested end
    if (options?.rowEnd && end >= options.rowEnd) {
      break
    }
  }
}

/**
 * Read Things from parquet and convert to Thing objects
 */
export async function readThings<TData = Record<string, unknown>>(
  file: ArrayBuffer | AsyncBuffer,
  options?: ReadOptions
): Promise<Thing<TData>[]> {
  const rows = await read<ThingsParquetData>(file, options)

  return rows.map((row) => ({
    url: row.url,
    type: row.type,
    id: row.id,
    data: JSON.parse(row.data) as TData,
    content: row.content || undefined,
    '@context': row.context ? JSON.parse(row.context) : undefined,
    at: new Date(row.at),
    by: row.by || undefined,
    in: row.in || undefined,
    version: row.version,
  }))
}

/**
 * Read Relationships from parquet and convert to Relationship objects
 */
export async function readRelationships<TData = Record<string, unknown>>(
  file: ArrayBuffer | AsyncBuffer,
  options?: ReadOptions
): Promise<Relationship<TData>[]> {
  const rows = await read<RelationshipsParquetData>(file, options)

  return rows.map((row) => ({
    id: row.id,
    predicate: row.predicate,
    reverse: row.reverse || undefined,
    from: row.from,
    to: row.to,
    data: row.data ? (JSON.parse(row.data) as TData) : undefined,
    at: new Date(row.at),
    by: row.by || undefined,
    in: row.in || undefined,
    do: row.do || undefined,
  }))
}

/**
 * Create a ParquetReader instance
 */
export function createReader(): IParquetReader {
  return {
    metadata,
    read,
    stream,
  }
}

export { metadata as parquetMetadata, read as parquetRead, stream as parquetStream }
