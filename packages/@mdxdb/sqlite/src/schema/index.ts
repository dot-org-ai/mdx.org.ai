/**
 * SQLite Schema Module
 *
 * Modular schema definitions for the mdxdb SQLite adapter.
 * Each table is defined in its own file for maintainability.
 *
 * Tables:
 * - things: Core graph nodes (versioned resources)
 * - relationships: Graph edges connecting things
 * - search: Chunked content with optional embeddings
 * - actions: Pending/active work items
 * - events: Immutable event log (streams to ClickHouse)
 * - artifacts: Cached compiled content (streams to ClickHouse/R2)
 *
 * @packageDocumentation
 */

// Re-export individual table schemas
export * from './things.js'
export * from './relationships.js'
export * from './search.js'
export * from './actions.js'
export * from './events.js'
export * from './artifacts.js'

// Import schemas for combined export
import { THINGS_TABLE, THINGS_SCHEMA, THINGS_INDEXES } from './things.js'
import { RELATIONSHIPS_TABLE, RELATIONSHIPS_SCHEMA, RELATIONSHIPS_INDEXES } from './relationships.js'
import { SEARCH_TABLE, SEARCH_SCHEMA, SEARCH_INDEXES } from './search.js'
import { ACTIONS_TABLE, ACTIONS_SCHEMA, ACTIONS_INDEXES } from './actions.js'
import { EVENTS_TABLE, EVENTS_SCHEMA, EVENTS_INDEXES } from './events.js'
import { ARTIFACTS_TABLE, ARTIFACTS_SCHEMA, ARTIFACTS_INDEXES } from './artifacts.js'

/**
 * All table names
 */
export const TABLES = [
  THINGS_TABLE,
  RELATIONSHIPS_TABLE,
  SEARCH_TABLE,
  ACTIONS_TABLE,
  EVENTS_TABLE,
  ARTIFACTS_TABLE,
] as const

export type TableName = (typeof TABLES)[number]

/**
 * Core tables (always needed)
 */
export const CORE_TABLES = [
  THINGS_TABLE,
  RELATIONSHIPS_TABLE,
  SEARCH_TABLE,
  ACTIONS_TABLE,
] as const

/**
 * Streaming tables (synced to ClickHouse/R2)
 */
export const STREAMING_TABLES = [
  EVENTS_TABLE,
  ARTIFACTS_TABLE,
] as const

/**
 * Map of table name to schema
 */
export const TABLE_SCHEMAS: Record<TableName, string> = {
  [THINGS_TABLE]: THINGS_SCHEMA,
  [RELATIONSHIPS_TABLE]: RELATIONSHIPS_SCHEMA,
  [SEARCH_TABLE]: SEARCH_SCHEMA,
  [ACTIONS_TABLE]: ACTIONS_SCHEMA,
  [EVENTS_TABLE]: EVENTS_SCHEMA,
  [ARTIFACTS_TABLE]: ARTIFACTS_SCHEMA,
}

/**
 * Map of table name to indexes
 */
export const TABLE_INDEXES: Record<TableName, string> = {
  [THINGS_TABLE]: THINGS_INDEXES,
  [RELATIONSHIPS_TABLE]: RELATIONSHIPS_INDEXES,
  [SEARCH_TABLE]: SEARCH_INDEXES,
  [ACTIONS_TABLE]: ACTIONS_INDEXES,
  [EVENTS_TABLE]: EVENTS_INDEXES,
  [ARTIFACTS_TABLE]: ARTIFACTS_INDEXES,
}

/**
 * Core schema (things, relationships, search, actions)
 * Execute each statement individually
 */
export const CORE_SCHEMA = [
  THINGS_SCHEMA,
  RELATIONSHIPS_SCHEMA,
  SEARCH_SCHEMA,
  ACTIONS_SCHEMA,
].join('\n\n')

/**
 * Core indexes
 */
export const CORE_INDEXES = [
  THINGS_INDEXES,
  RELATIONSHIPS_INDEXES,
  SEARCH_INDEXES,
  ACTIONS_INDEXES,
].join('\n')

/**
 * Full schema for all tables
 */
export const FULL_SCHEMA = [
  THINGS_SCHEMA,
  RELATIONSHIPS_SCHEMA,
  SEARCH_SCHEMA,
  ACTIONS_SCHEMA,
  EVENTS_SCHEMA,
  ARTIFACTS_SCHEMA,
].join('\n\n')

/**
 * Full indexes for all tables
 */
export const FULL_INDEXES = [
  THINGS_INDEXES,
  RELATIONSHIPS_INDEXES,
  SEARCH_INDEXES,
  ACTIONS_INDEXES,
  EVENTS_INDEXES,
  ARTIFACTS_INDEXES,
].join('\n')

/**
 * Get schema for a specific table
 */
export function getTableSchema(table: TableName): string {
  return TABLE_SCHEMAS[table]
}

/**
 * Get indexes for a specific table
 */
export function getTableIndexes(table: TableName): string {
  return TABLE_INDEXES[table]
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
 * Get all schema statements (tables + indexes)
 */
export function getAllSchemaStatements(): string[] {
  const statements: string[] = []

  // Add table schemas
  for (const table of TABLES) {
    statements.push(TABLE_SCHEMAS[table].trim())
  }

  // Add indexes (split by semicolon since multiple per table)
  for (const table of TABLES) {
    const indexStatements = parseSchemaStatements(TABLE_INDEXES[table])
    statements.push(...indexStatements)
  }

  return statements
}

/**
 * Get core schema statements (tables + indexes)
 */
export function getCoreSchemaStatements(): string[] {
  const statements: string[] = []

  for (const table of CORE_TABLES) {
    statements.push(TABLE_SCHEMAS[table].trim())
    const indexStatements = parseSchemaStatements(TABLE_INDEXES[table])
    statements.push(...indexStatements)
  }

  return statements
}

/**
 * Schema version for migration tracking
 * Increment when schema changes
 */
export const SCHEMA_VERSION = 1

/**
 * Schema version history
 */
export const SCHEMA_VERSIONS = {
  1: 'Initial modular schema with things, relationships, search, actions, events, artifacts',
} as const
