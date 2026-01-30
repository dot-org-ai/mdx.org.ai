/**
 * @mdxdb/do Schema
 *
 * Re-exports schema from @mdxdb/sqlite.
 * No additional tables needed - hierarchy uses relationships.
 *
 * @packageDocumentation
 */

// Re-export all schema from sqlite
export {
  DATA_TABLE,
  RELS_TABLE,
  DATA_SCHEMA,
  DATA_INDEXES,
  RELS_SCHEMA,
  RELS_INDEXES,
  TABLES,
  getAllSchemaStatements,
  SCHEMA_VERSION,
} from '@mdxdb/sqlite/schema'
