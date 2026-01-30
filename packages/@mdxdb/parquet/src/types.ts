/**
 * @mdxdb/parquet Types
 *
 * Type definitions for parquet read/write operations.
 * Designed for compatibility with Cloudflare Workers and Snippets.
 *
 * @packageDocumentation
 */

/**
 * Parquet metadata from file header
 */
export interface ParquetMetadata {
  /** Total number of rows */
  numRows: number
  /** Number of row groups */
  numRowGroups: number
  /** Column information */
  columns: ParquetColumnMetadata[]
  /** Schema information */
  schema: ParquetSchemaElement[]
  /** File metadata key-value pairs */
  keyValueMetadata?: Record<string, string>
  /** Created by string */
  createdBy?: string
}

/**
 * Parquet column metadata
 */
export interface ParquetColumnMetadata {
  name: string
  type: ParquetType
  numValues?: number
  encodings?: string[]
  pathInSchema?: string[]
  codec?: string
}

/**
 * Parquet schema element
 */
export interface ParquetSchemaElement {
  name: string
  type?: ParquetType
  typeLength?: number
  repetitionType?: 'REQUIRED' | 'OPTIONAL' | 'REPEATED'
  convertedType?: string
  logicalType?: ParquetLogicalType
  numChildren?: number
  children?: ParquetSchemaElement[]
}

/**
 * Parquet physical types
 */
export type ParquetType =
  | 'BOOLEAN'
  | 'INT32'
  | 'INT64'
  | 'INT96'
  | 'FLOAT'
  | 'DOUBLE'
  | 'BYTE_ARRAY'
  | 'FIXED_LEN_BYTE_ARRAY'

/**
 * Parquet logical types
 */
export interface ParquetLogicalType {
  type: string
  precision?: number
  scale?: number
  unit?: string
  isAdjustedToUTC?: boolean
}

/**
 * Read options for parquet files
 */
export interface ReadOptions {
  /** Specific columns to read (default: all) */
  columns?: string[]
  /** Row range to read (default: all) */
  rowStart?: number
  rowEnd?: number
  /** Specific row groups to read */
  rowGroups?: number[]
}

/**
 * Write options for parquet files
 */
export interface WriteOptions {
  /** Compression codec */
  compression?: 'UNCOMPRESSED' | 'SNAPPY' | 'GZIP' | 'ZSTD'
  /** Row group size (default: 1000000) */
  rowGroupSize?: number
  /** Page size (default: 8192) */
  pageSize?: number
  /** File metadata key-value pairs */
  keyValueMetadata?: Record<string, string>
}

/**
 * Parquet schema field definition for writing
 */
export interface ParquetSchemaField {
  name: string
  type: 'BOOLEAN' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'UTF8' | 'JSON' | 'TIMESTAMP' | 'LIST' | 'MAP'
  optional?: boolean
  repeated?: boolean
  /** For nested types (LIST, MAP) */
  fields?: ParquetSchemaField[]
}

/**
 * Parquet schema for writing
 */
export interface ParquetSchema {
  fields: ParquetSchemaField[]
}

/**
 * Thing entity from @mdxdb/sqlite (replicated here for independence)
 */
export interface Thing<TData = Record<string, unknown>> {
  url: string
  type: string
  id: string
  data: TData
  content?: string
  '@context'?: string | Record<string, unknown>
  at: Date
  by?: string
  in?: string
  version: number
}

/**
 * Relationship from @mdxdb/sqlite (replicated here for independence)
 */
export interface Relationship<TData = Record<string, unknown>> {
  id: string
  predicate: string
  reverse?: string
  from: string
  to: string
  data?: TData
  at: Date
  by?: string
  in?: string
  do?: string
}

/**
 * Parquet reader interface
 */
export interface ParquetReader {
  /**
   * Read parquet file metadata
   * Optimized for Snippets - only reads header (minimal bytes)
   */
  metadata(file: ArrayBuffer | AsyncBuffer): Promise<ParquetMetadata>

  /**
   * Read all rows from parquet file
   */
  read<T = Record<string, unknown>>(file: ArrayBuffer | AsyncBuffer, options?: ReadOptions): Promise<T[]>

  /**
   * Stream rows from parquet file
   */
  stream<T = Record<string, unknown>>(file: ArrayBuffer | AsyncBuffer, options?: ReadOptions): AsyncIterable<T>
}

/**
 * Parquet writer interface
 */
export interface ParquetWriter {
  /**
   * Write data to parquet format
   */
  write<T = Record<string, unknown>>(data: T[], schema?: ParquetSchema, options?: WriteOptions): Promise<ArrayBuffer>

  /**
   * Write Thing entities to parquet
   */
  writeThings(things: Thing[], options?: WriteOptions): Promise<ArrayBuffer>

  /**
   * Write Relationship entities to parquet
   */
  writeRelationships(relationships: Relationship[], options?: WriteOptions): Promise<ArrayBuffer>
}

/**
 * Async buffer interface for streaming reads
 * Compatible with hyparquet's asyncBuffer
 */
export interface AsyncBuffer {
  /** Total byte length */
  byteLength: number
  /** Read a slice of the buffer */
  slice(start: number, end?: number): Promise<ArrayBuffer>
}

/**
 * Create an AsyncBuffer from a URL for HTTP range requests
 */
export interface AsyncBufferOptions {
  /** Total file size (required for range requests) */
  byteLength: number
  /** Custom fetch function */
  fetch?: typeof fetch
}

/**
 * Result of reading Things from parquet
 */
export interface ThingsParquetData {
  url: string
  type: string
  id: string
  data: string // JSON string
  content: string | null
  context: string | null
  at: string // ISO timestamp
  by: string | null
  in: string | null
  version: number
}

/**
 * Result of reading Relationships from parquet
 */
export interface RelationshipsParquetData {
  id: string
  predicate: string
  reverse: string | null
  from: string
  to: string
  data: string | null // JSON string
  at: string // ISO timestamp
  by: string | null
  in: string | null
  do: string | null
}

/**
 * Bidirectional relationship index entry
 */
export interface RelationshipIndexEntry {
  lookup_key: string
  direction: 'forward' | 'reverse'
  id: string
  predicate: string
  reverse: string | null
  from: string
  to: string
  data: string | null
  at: string
  by: string | null
  in: string | null
  do: string | null
}
