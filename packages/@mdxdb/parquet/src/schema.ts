/**
 * Parquet Schema Converters
 *
 * Convert mdxdb Thing/Relationship schemas to parquet format.
 *
 * @packageDocumentation
 */

import type { ParquetSchema, ParquetSchemaField } from './types.js'

/**
 * Parquet schema for Thing entities
 * Matches @mdxdb/sqlite _data table
 */
export function thingSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'url', type: 'UTF8', optional: false },
      { name: 'type', type: 'UTF8', optional: false },
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'data', type: 'JSON', optional: false },
      { name: 'content', type: 'UTF8', optional: true },
      { name: 'context', type: 'UTF8', optional: true },
      { name: 'at', type: 'UTF8', optional: false },
      { name: 'by', type: 'UTF8', optional: true },
      { name: 'in', type: 'UTF8', optional: true },
      { name: 'version', type: 'INT32', optional: false },
    ],
  }
}

/**
 * Parquet schema for Relationship entities
 * Matches @mdxdb/sqlite _rels table with bidirectional predicates
 */
export function relationshipSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'predicate', type: 'UTF8', optional: false },
      { name: 'reverse', type: 'UTF8', optional: true },
      { name: 'from', type: 'UTF8', optional: false },
      { name: 'to', type: 'UTF8', optional: false },
      { name: 'data', type: 'JSON', optional: true },
      { name: 'at', type: 'UTF8', optional: false },
      { name: 'by', type: 'UTF8', optional: true },
      { name: 'in', type: 'UTF8', optional: true },
      { name: 'do', type: 'UTF8', optional: true },
    ],
  }
}

/**
 * Parquet schema for bidirectional relationship index
 * Each relationship is stored twice - once per direction
 * Sorted by lookup_key for efficient queries
 */
export function relationshipIndexSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'lookup_key', type: 'UTF8', optional: false },  // from+predicate or to+reverse
      { name: 'direction', type: 'UTF8', optional: false },   // 'forward' or 'reverse'
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'predicate', type: 'UTF8', optional: false },
      { name: 'reverse', type: 'UTF8', optional: true },
      { name: 'from', type: 'UTF8', optional: false },
      { name: 'to', type: 'UTF8', optional: false },
      { name: 'data', type: 'JSON', optional: true },
      { name: 'at', type: 'UTF8', optional: false },
      { name: 'by', type: 'UTF8', optional: true },
      { name: 'in', type: 'UTF8', optional: true },
      { name: 'do', type: 'UTF8', optional: true },
    ],
  }
}

/**
 * Parquet schema for search chunks
 */
export function searchSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'thing_url', type: 'UTF8', optional: false },
      { name: 'chunk_index', type: 'INT32', optional: false },
      { name: 'content', type: 'UTF8', optional: false },
      { name: 'embedding', type: 'JSON', optional: true },
      { name: 'metadata', type: 'JSON', optional: true },
      { name: 'created_at', type: 'UTF8', optional: false },
    ],
  }
}

/**
 * Parquet schema for events
 */
export function eventSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'type', type: 'UTF8', optional: false },
      { name: 'timestamp', type: 'UTF8', optional: false },
      { name: 'source', type: 'UTF8', optional: false },
      { name: 'data', type: 'JSON', optional: false },
      { name: 'correlation_id', type: 'UTF8', optional: true },
      { name: 'causation_id', type: 'UTF8', optional: true },
    ],
  }
}

/**
 * Parquet schema for actions
 */
export function actionSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'actor', type: 'UTF8', optional: false },
      { name: 'object', type: 'UTF8', optional: false },
      { name: 'action', type: 'UTF8', optional: false },
      { name: 'status', type: 'UTF8', optional: false },
      { name: 'created_at', type: 'UTF8', optional: false },
      { name: 'updated_at', type: 'UTF8', optional: false },
      { name: 'started_at', type: 'UTF8', optional: true },
      { name: 'completed_at', type: 'UTF8', optional: true },
      { name: 'result', type: 'JSON', optional: true },
      { name: 'error', type: 'UTF8', optional: true },
      { name: 'metadata', type: 'JSON', optional: true },
    ],
  }
}

/**
 * Parquet schema for artifacts
 */
export function artifactSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'key', type: 'UTF8', optional: false },
      { name: 'type', type: 'UTF8', optional: false },
      { name: 'source', type: 'UTF8', optional: false },
      { name: 'source_hash', type: 'UTF8', optional: false },
      { name: 'created_at', type: 'UTF8', optional: false },
      { name: 'expires_at', type: 'UTF8', optional: true },
      { name: 'content', type: 'JSON', optional: false },
      { name: 'size', type: 'INT64', optional: true },
      { name: 'metadata', type: 'JSON', optional: true },
    ],
  }
}

/**
 * Parquet schema for DO context metadata
 */
export function contextSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'parent_url', type: 'UTF8', optional: true },
      { name: 'canonical_url', type: 'UTF8', optional: false },
      { name: 'created_at', type: 'UTF8', optional: false },
      { name: 'updated_at', type: 'UTF8', optional: false },
    ],
  }
}

/**
 * Parquet schema for DO children
 */
export function childrenSchema(): ParquetSchema {
  return {
    fields: [
      { name: 'id', type: 'UTF8', optional: false },
      { name: 'path', type: 'UTF8', optional: false },
      { name: 'canonical_url', type: 'UTF8', optional: false },
      { name: 'created_at', type: 'UTF8', optional: false },
    ],
  }
}

/**
 * Convert mdxdb schema field type to parquet type
 */
export function mdxdbTypeToParquet(mdxdbType: string): ParquetSchemaField['type'] {
  switch (mdxdbType.toLowerCase()) {
    case 'string':
    case 'text':
      return 'UTF8'
    case 'number':
    case 'int':
    case 'integer':
      return 'INT64'
    case 'float':
    case 'double':
    case 'decimal':
      return 'DOUBLE'
    case 'boolean':
    case 'bool':
      return 'BOOLEAN'
    case 'json':
    case 'object':
    case 'array':
      return 'JSON'
    case 'timestamp':
    case 'datetime':
    case 'date':
      return 'TIMESTAMP'
    default:
      return 'UTF8'
  }
}

/**
 * Create a custom parquet schema from field definitions
 */
export function createSchema(fields: Array<{ name: string; type: string; optional?: boolean }>): ParquetSchema {
  return {
    fields: fields.map((f) => ({
      name: f.name,
      type: mdxdbTypeToParquet(f.type),
      optional: f.optional ?? false,
    })),
  }
}

/**
 * Infer parquet schema from data
 */
export function inferSchema(data: Record<string, unknown>[]): ParquetSchema {
  if (data.length === 0) {
    return { fields: [] }
  }

  const sample = data[0]!
  const fields: ParquetSchemaField[] = []

  for (const [key, value] of Object.entries(sample)) {
    let type: ParquetSchemaField['type'] = 'UTF8'
    let optional = false

    if (value === null || value === undefined) {
      optional = true
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN'
    } else if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'INT64' : 'DOUBLE'
    } else if (typeof value === 'object') {
      type = 'JSON'
    } else if (value instanceof Date) {
      type = 'TIMESTAMP'
    }

    // Check across all records if field is optional
    if (!optional) {
      for (const record of data) {
        if (record[key] === null || record[key] === undefined) {
          optional = true
          break
        }
      }
    }

    fields.push({ name: key, type, optional })
  }

  return { fields }
}
