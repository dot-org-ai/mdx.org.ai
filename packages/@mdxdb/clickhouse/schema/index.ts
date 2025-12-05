/**
 * ClickHouse Schema Module
 *
 * Modular schema definitions for the mdxdb ClickHouse adapter.
 * Each table is defined in its own file for maintainability.
 *
 * @packageDocumentation
 */

// Re-export individual table schemas
export * from './events.js'
export * from './actions.js'
export * from './things.js'
export * from './relationships.js'
export * from './search.js'
export * from './artifacts.js'
export * from './access.js'
export * from './types.js'

// Import schemas for combined export
import { EVENTS_TABLE, EVENTS_SCHEMA } from './events.js'
import { ACTIONS_TABLE, ACTIONS_SCHEMA } from './actions.js'
import { THINGS_TABLE, THINGS_SCHEMA } from './things.js'
import { RELATIONSHIPS_TABLE, RELATIONSHIPS_SCHEMA } from './relationships.js'
import { SEARCH_TABLE, SEARCH_SCHEMA } from './search.js'
import { ARTIFACTS_TABLE, ARTIFACTS_SCHEMA } from './artifacts.js'
import { ACCESS_CONTROL_TABLE, ACCESS_CONTROL_SCHEMA } from './access.js'

/**
 * All table names
 */
export const TABLES = [
  EVENTS_TABLE,
  ACTIONS_TABLE,
  THINGS_TABLE,
  RELATIONSHIPS_TABLE,
  SEARCH_TABLE,
  ARTIFACTS_TABLE,
  ACCESS_CONTROL_TABLE,
] as const

export type TableName = (typeof TABLES)[number]

/**
 * Map of table name to schema
 */
export const TABLE_SCHEMAS: Record<TableName, string> = {
  [EVENTS_TABLE]: EVENTS_SCHEMA,
  [ACTIONS_TABLE]: ACTIONS_SCHEMA,
  [THINGS_TABLE]: THINGS_SCHEMA,
  [RELATIONSHIPS_TABLE]: RELATIONSHIPS_SCHEMA,
  [SEARCH_TABLE]: SEARCH_SCHEMA,
  [ARTIFACTS_TABLE]: ARTIFACTS_SCHEMA,
  [ACCESS_CONTROL_TABLE]: ACCESS_CONTROL_SCHEMA,
}

/**
 * Combined schema for all tables (excluding access control)
 * Execute each statement individually (split by semicolon)
 *
 * Note: Access control schema is separate and requires admin privileges
 */
export const FULL_SCHEMA = [
  EVENTS_SCHEMA,
  ACTIONS_SCHEMA,
  THINGS_SCHEMA,
  RELATIONSHIPS_SCHEMA,
  SEARCH_SCHEMA,
  ARTIFACTS_SCHEMA,
].join('\n\n')

/**
 * Full schema including access control
 * Requires access_management=1 in ClickHouse config
 */
export const FULL_SCHEMA_WITH_ACCESS = [
  EVENTS_SCHEMA,
  ACTIONS_SCHEMA,
  THINGS_SCHEMA,
  RELATIONSHIPS_SCHEMA,
  SEARCH_SCHEMA,
  ARTIFACTS_SCHEMA,
  ACCESS_CONTROL_SCHEMA,
].join('\n\n')

/**
 * Get schema for a specific table
 */
export function getTableSchema(table: TableName): string {
  return TABLE_SCHEMAS[table]
}

/**
 * Parse schema into individual statements
 */
export function parseSchemaStatements(schema: string): string[] {
  return schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
}

/**
 * Get all schema statements
 */
export function getAllSchemaStatements(): string[] {
  return parseSchemaStatements(FULL_SCHEMA)
}

/**
 * Schema version for migration tracking
 * Increment when schema changes
 */
export const SCHEMA_VERSION = 3

/**
 * Schema version history
 */
export const SCHEMA_VERSIONS = {
  1: 'Initial schema with basic tables',
  2: 'Actor-Event-Object-Result pattern, linguistic verb conjugations, HNSW vector search',
  3: 'Access control with ANONYMOUS and TENANT users/roles, row-level security',
} as const
