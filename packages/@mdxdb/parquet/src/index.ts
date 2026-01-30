/**
 * @mdxdb/parquet
 *
 * Pure JS parquet read/write for mdxdb.
 * Works in Cloudflare Workers and Snippets.
 *
 * Reader (~10KB) - optimized for Snippets
 * Writer (~100KB) - use lazy loading in Snippets
 *
 * @example
 * ```ts
 * import { createReader, createWriter } from '@mdxdb/parquet'
 *
 * // Read parquet file
 * const reader = createReader()
 * const metadata = await reader.metadata(buffer)
 * const data = await reader.read(buffer)
 *
 * // Write parquet file
 * const writer = createWriter()
 * const buffer = await writer.write(data)
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  ParquetMetadata,
  ParquetColumnMetadata,
  ParquetSchemaElement,
  ParquetType,
  ParquetLogicalType,
  ReadOptions,
  WriteOptions,
  ParquetSchemaField,
  ParquetSchema,
  ParquetReader,
  ParquetWriter,
  AsyncBuffer,
  AsyncBufferOptions,
  Thing,
  Relationship,
  ThingsParquetData,
  RelationshipsParquetData,
  RelationshipIndexEntry,
} from './types.js'

// Reader exports
export {
  createReader,
  createAsyncBuffer,
  metadata,
  read,
  stream,
  readThings,
  readRelationships,
  parquetMetadata,
  parquetRead,
  parquetStream,
} from './reader.js'

// Writer exports
export {
  createWriter,
  write,
  writeThings,
  writeRelationships,
  writeRelationshipsIndexed,
  parquetWrite,
} from './writer.js'

// Schema exports
export {
  thingSchema,
  relationshipSchema,
  relationshipIndexSchema,
  searchSchema,
  eventSchema,
  actionSchema,
  artifactSchema,
  contextSchema,
  childrenSchema,
  mdxdbTypeToParquet,
  createSchema,
  inferSchema,
} from './schema.js'
