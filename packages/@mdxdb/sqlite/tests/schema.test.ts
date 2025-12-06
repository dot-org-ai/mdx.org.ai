/**
 * Schema Tests
 *
 * Tests for SQLite table schemas, column definitions, and SQL generation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Schema exports
  FULL_SCHEMA,
  CORE_SCHEMA,
  FULL_INDEXES,
  CORE_INDEXES,
  SCHEMA_VERSION,
  TABLES,
  CORE_TABLES,
  STREAMING_TABLES,
  TABLE_SCHEMAS,
  TABLE_INDEXES,
  getAllSchemaStatements,
  getCoreSchemaStatements,
  getTableSchema,
  getTableIndexes,
  parseSchemaStatements,
  // Individual schemas
  THINGS_SCHEMA,
  THINGS_TABLE,
  THINGS_COLUMNS,
  THINGS_INDEXES,
  THING_EVENTS,
  RELATIONSHIPS_SCHEMA,
  RELATIONSHIPS_TABLE,
  RELATIONSHIPS_COLUMNS,
  RELATIONSHIPS_INDEXES,
  RELATIONSHIP_TYPES,
  EVENTS_SCHEMA,
  EVENTS_TABLE,
  EVENTS_COLUMNS,
  EVENTS_INDEXES,
  EVENT_PATTERNS,
  ACTIONS_SCHEMA,
  ACTIONS_TABLE,
  ACTIONS_COLUMNS,
  ACTIONS_INDEXES,
  ACTION_STATUSES,
  ARTIFACTS_SCHEMA,
  ARTIFACTS_TABLE,
  ARTIFACTS_COLUMNS,
  ARTIFACTS_INDEXES,
  ARTIFACT_TYPES,
  SEARCH_SCHEMA,
  SEARCH_TABLE,
  SEARCH_COLUMNS,
  SEARCH_INDEXES,
  CHUNK_CONFIG,
} from '../schema'

// =============================================================================
// Schema Version Tests
// =============================================================================

describe('Schema Version', () => {
  it('has a valid schema version', () => {
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
    expect(typeof SCHEMA_VERSION).toBe('number')
  })

  it('exports all tables', () => {
    expect(TABLES).toContain('things')
    expect(TABLES).toContain('relationships')
    expect(TABLES).toContain('search')
    expect(TABLES).toContain('actions')
    expect(TABLES).toContain('events')
    expect(TABLES).toContain('artifacts')
  })

  it('exports core tables', () => {
    expect(CORE_TABLES).toContain('things')
    expect(CORE_TABLES).toContain('relationships')
    expect(CORE_TABLES).toContain('search')
    expect(CORE_TABLES).toContain('actions')
    expect(CORE_TABLES).not.toContain('events')
    expect(CORE_TABLES).not.toContain('artifacts')
  })

  it('exports streaming tables', () => {
    expect(STREAMING_TABLES).toContain('events')
    expect(STREAMING_TABLES).toContain('artifacts')
    expect(STREAMING_TABLES).not.toContain('things')
  })

  it('has TABLE_SCHEMAS for all tables', () => {
    for (const table of TABLES) {
      expect(TABLE_SCHEMAS).toHaveProperty(table)
      expect(TABLE_SCHEMAS[table]).toContain('CREATE TABLE')
    }
  })

  it('has TABLE_INDEXES for all tables', () => {
    for (const table of TABLES) {
      expect(TABLE_INDEXES).toHaveProperty(table)
      expect(TABLE_INDEXES[table]).toContain('CREATE INDEX')
    }
  })
})

// =============================================================================
// Things Schema Tests
// =============================================================================

describe('Things Schema', () => {
  it('has valid table name', () => {
    expect(THINGS_TABLE).toBe('things')
  })

  it('creates table with correct structure', () => {
    expect(THINGS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS things')
    expect(THINGS_SCHEMA).toContain('url TEXT PRIMARY KEY')
  })

  it('has required columns', () => {
    const requiredColumns = ['url', 'ns', 'type', 'id', 'data', 'content', 'created_at', 'updated_at', 'version']
    for (const col of requiredColumns) {
      expect(THINGS_COLUMNS).toHaveProperty(col)
    }
  })

  it('has url as primary identifier', () => {
    expect(THINGS_SCHEMA).toContain('url TEXT PRIMARY KEY')
    expect(THINGS_COLUMNS.url).toBe('TEXT PRIMARY KEY')
  })

  it('has version for optimistic locking', () => {
    expect(THINGS_SCHEMA).toContain('version INTEGER')
    expect(THINGS_COLUMNS.version).toContain('INTEGER')
  })

  it('has JSON data column as TEXT', () => {
    expect(THINGS_SCHEMA).toContain('data TEXT')
    expect(THINGS_COLUMNS.data).toContain('TEXT')
  })

  it('has soft delete support', () => {
    expect(THINGS_COLUMNS).toHaveProperty('deleted_at')
  })

  it('has context for JSON-LD', () => {
    expect(THINGS_COLUMNS).toHaveProperty('context')
  })

  it('has indexes for common queries', () => {
    expect(THINGS_INDEXES).toContain('idx_things_ns')
    expect(THINGS_INDEXES).toContain('idx_things_type')
    expect(THINGS_INDEXES).toContain('idx_things_ns_type')
    expect(THINGS_INDEXES).toContain('idx_things_deleted_at')
    expect(THINGS_INDEXES).toContain('idx_things_ns_type_id')
  })

  it('has unique constraint on ns/type/id', () => {
    expect(THINGS_INDEXES).toContain('CREATE UNIQUE INDEX')
    expect(THINGS_INDEXES).toContain('things(ns, type, id)')
  })

  it('defines thing events', () => {
    expect(THING_EVENTS).toContain('created')
    expect(THING_EVENTS).toContain('updated')
    expect(THING_EVENTS).toContain('deleted')
  })
})

// =============================================================================
// Relationships Schema Tests
// =============================================================================

describe('Relationships Schema', () => {
  it('has valid table name', () => {
    expect(RELATIONSHIPS_TABLE).toBe('relationships')
  })

  it('creates table with correct structure', () => {
    expect(RELATIONSHIPS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS relationships')
    expect(RELATIONSHIPS_SCHEMA).toContain('id TEXT PRIMARY KEY')
  })

  it('has graph edge fields', () => {
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('from_url')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('to_url')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('type')
  })

  it('has foreign key constraint', () => {
    expect(RELATIONSHIPS_SCHEMA).toContain('FOREIGN KEY')
    expect(RELATIONSHIPS_SCHEMA).toContain('ON DELETE CASCADE')
  })

  it('has data field for edge metadata', () => {
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('data')
  })

  it('has indexes for traversal', () => {
    expect(RELATIONSHIPS_INDEXES).toContain('idx_rel_from')
    expect(RELATIONSHIPS_INDEXES).toContain('idx_rel_to')
    expect(RELATIONSHIPS_INDEXES).toContain('idx_rel_type')
    expect(RELATIONSHIPS_INDEXES).toContain('idx_rel_from_type')
    expect(RELATIONSHIPS_INDEXES).toContain('idx_rel_to_type')
  })

  it('has unique constraint on edges', () => {
    expect(RELATIONSHIPS_INDEXES).toContain('CREATE UNIQUE INDEX')
    expect(RELATIONSHIPS_INDEXES).toContain('relationships(from_url, type, to_url)')
  })

  it('defines relationship types', () => {
    expect(RELATIONSHIP_TYPES).toContain('author')
    expect(RELATIONSHIP_TYPES).toContain('parent')
    expect(RELATIONSHIP_TYPES).toContain('child')
    expect(RELATIONSHIP_TYPES).toContain('references')
    expect(RELATIONSHIP_TYPES).toContain('related')
    expect(RELATIONSHIP_TYPES).toContain('tagged')
    expect(RELATIONSHIP_TYPES).toContain('category')
  })
})

// =============================================================================
// Search Schema Tests
// =============================================================================

describe('Search Schema', () => {
  it('has valid table name', () => {
    expect(SEARCH_TABLE).toBe('search')
  })

  it('creates table with correct structure', () => {
    expect(SEARCH_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS search')
    expect(SEARCH_SCHEMA).toContain('id TEXT PRIMARY KEY')
  })

  it('has chunking fields', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('thing_url')
    expect(SEARCH_COLUMNS).toHaveProperty('chunk_index')
    expect(SEARCH_COLUMNS).toHaveProperty('content')
  })

  it('has embedding field for vector search', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('embedding')
    // SQLite stores embeddings as JSON text
    expect(SEARCH_COLUMNS.embedding).toBe('TEXT')
  })

  it('has metadata field', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('metadata')
  })

  it('has foreign key constraint', () => {
    expect(SEARCH_SCHEMA).toContain('FOREIGN KEY')
    expect(SEARCH_SCHEMA).toContain('things(url)')
    expect(SEARCH_SCHEMA).toContain('ON DELETE CASCADE')
  })

  it('has indexes for chunk retrieval', () => {
    expect(SEARCH_INDEXES).toContain('idx_search_thing')
    expect(SEARCH_INDEXES).toContain('idx_search_thing_chunk')
  })

  it('defines chunk configuration', () => {
    expect(CHUNK_CONFIG.size).toBe(1000)
    expect(CHUNK_CONFIG.overlap).toBe(200)
  })
})

// =============================================================================
// Actions Schema Tests
// =============================================================================

describe('Actions Schema', () => {
  it('has valid table name', () => {
    expect(ACTIONS_TABLE).toBe('actions')
  })

  it('creates table with correct structure', () => {
    expect(ACTIONS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS actions')
    expect(ACTIONS_SCHEMA).toContain('id TEXT PRIMARY KEY')
  })

  it('has Actor-Object-Action pattern fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('actor')
    expect(ACTIONS_COLUMNS).toHaveProperty('object')
    expect(ACTIONS_COLUMNS).toHaveProperty('action')
  })

  it('has status field', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('status')
    expect(ACTIONS_COLUMNS.status).toContain("DEFAULT 'pending'")
  })

  it('has timestamp fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('created_at')
    expect(ACTIONS_COLUMNS).toHaveProperty('updated_at')
    expect(ACTIONS_COLUMNS).toHaveProperty('started_at')
    expect(ACTIONS_COLUMNS).toHaveProperty('completed_at')
  })

  it('has result and error fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('result')
    expect(ACTIONS_COLUMNS).toHaveProperty('error')
  })

  it('has metadata field', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('metadata')
  })

  it('has indexes for querying', () => {
    expect(ACTIONS_INDEXES).toContain('idx_actions_actor')
    expect(ACTIONS_INDEXES).toContain('idx_actions_object')
    expect(ACTIONS_INDEXES).toContain('idx_actions_action')
    expect(ACTIONS_INDEXES).toContain('idx_actions_status')
    expect(ACTIONS_INDEXES).toContain('idx_actions_actor_status')
  })

  it('defines action statuses', () => {
    expect(ACTION_STATUSES).toContain('pending')
    expect(ACTION_STATUSES).toContain('active')
    expect(ACTION_STATUSES).toContain('completed')
    expect(ACTION_STATUSES).toContain('failed')
    expect(ACTION_STATUSES).toContain('cancelled')
  })
})

// =============================================================================
// Events Schema Tests
// =============================================================================

describe('Events Schema', () => {
  it('has valid table name', () => {
    expect(EVENTS_TABLE).toBe('events')
  })

  it('creates table with correct structure', () => {
    expect(EVENTS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS events')
    expect(EVENTS_SCHEMA).toContain('id TEXT PRIMARY KEY')
  })

  it('has event fields', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('type')
    expect(EVENTS_COLUMNS).toHaveProperty('timestamp')
    expect(EVENTS_COLUMNS).toHaveProperty('source')
    expect(EVENTS_COLUMNS).toHaveProperty('data')
  })

  it('has tracing fields', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('correlation_id')
    expect(EVENTS_COLUMNS).toHaveProperty('causation_id')
  })

  it('has synced_at for ClickHouse streaming', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('synced_at')
  })

  it('has indexes for querying', () => {
    expect(EVENTS_INDEXES).toContain('idx_events_type')
    expect(EVENTS_INDEXES).toContain('idx_events_source')
    expect(EVENTS_INDEXES).toContain('idx_events_timestamp')
    expect(EVENTS_INDEXES).toContain('idx_events_correlation')
    expect(EVENTS_INDEXES).toContain('idx_events_synced')
  })

  it('defines event patterns', () => {
    expect(EVENT_PATTERNS.lifecycle).toContain('created')
    expect(EVENT_PATTERNS.lifecycle).toContain('updated')
    expect(EVENT_PATTERNS.lifecycle).toContain('deleted')
    expect(EVENT_PATTERNS.user).toContain('login')
    expect(EVENT_PATTERNS.user).toContain('logout')
    expect(EVENT_PATTERNS.system).toContain('sync.started')
    expect(EVENT_PATTERNS.system).toContain('sync.completed')
  })
})

// =============================================================================
// Artifacts Schema Tests
// =============================================================================

describe('Artifacts Schema', () => {
  it('has valid table name', () => {
    expect(ARTIFACTS_TABLE).toBe('artifacts')
  })

  it('creates table with correct structure', () => {
    expect(ARTIFACTS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS artifacts')
    expect(ARTIFACTS_SCHEMA).toContain('key TEXT PRIMARY KEY')
  })

  it('has content storage fields', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('type')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('source')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('source_hash')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('content')
  })

  it('has cache control fields', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('expires_at')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('size')
  })

  it('has metadata field', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('metadata')
  })

  it('has synced_at for ClickHouse/R2 streaming', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('synced_at')
  })

  it('has indexes for querying', () => {
    expect(ARTIFACTS_INDEXES).toContain('idx_artifacts_type')
    expect(ARTIFACTS_INDEXES).toContain('idx_artifacts_source')
    expect(ARTIFACTS_INDEXES).toContain('idx_artifacts_source_type')
    expect(ARTIFACTS_INDEXES).toContain('idx_artifacts_expires')
    expect(ARTIFACTS_INDEXES).toContain('idx_artifacts_synced')
  })

  it('defines comprehensive artifact types', () => {
    // Compiled code
    expect(ARTIFACT_TYPES).toContain('esm')
    expect(ARTIFACT_TYPES).toContain('cjs')
    expect(ARTIFACT_TYPES).toContain('ast')

    // Rendered content
    expect(ARTIFACT_TYPES).toContain('html')
    expect(ARTIFACT_TYPES).toContain('markdown')
    expect(ARTIFACT_TYPES).toContain('text')

    // Structured data
    expect(ARTIFACT_TYPES).toContain('json')
    expect(ARTIFACT_TYPES).toContain('jsonld')
    expect(ARTIFACT_TYPES).toContain('yaml')

    // Search/RAG
    expect(ARTIFACT_TYPES).toContain('chunks')
    expect(ARTIFACT_TYPES).toContain('embedding')

    // Media
    expect(ARTIFACT_TYPES).toContain('thumbnail')
    expect(ARTIFACT_TYPES).toContain('preview')
    expect(ARTIFACT_TYPES).toContain('og-image')

    // Export formats
    expect(ARTIFACT_TYPES).toContain('pdf')
    expect(ARTIFACT_TYPES).toContain('docx')
    expect(ARTIFACT_TYPES).toContain('epub')
  })
})

// =============================================================================
// Full Schema Tests
// =============================================================================

describe('Full Schema', () => {
  it('contains all table schemas', () => {
    expect(FULL_SCHEMA).toContain('things')
    expect(FULL_SCHEMA).toContain('relationships')
    expect(FULL_SCHEMA).toContain('search')
    expect(FULL_SCHEMA).toContain('actions')
    expect(FULL_SCHEMA).toContain('events')
    expect(FULL_SCHEMA).toContain('artifacts')
  })

  it('core schema contains only core tables', () => {
    expect(CORE_SCHEMA).toContain('things')
    expect(CORE_SCHEMA).toContain('relationships')
    expect(CORE_SCHEMA).toContain('search')
    expect(CORE_SCHEMA).toContain('actions')
    // Events and artifacts are streaming tables
    expect(CORE_SCHEMA).not.toContain('events')
    expect(CORE_SCHEMA).not.toContain('artifacts')
  })

  it('getAllSchemaStatements returns array', () => {
    const statements = getAllSchemaStatements()
    expect(Array.isArray(statements)).toBe(true)
    expect(statements.length).toBeGreaterThan(0)
  })

  it('getAllSchemaStatements includes tables and indexes', () => {
    const statements = getAllSchemaStatements()
    const tableStatements = statements.filter(s => s.includes('CREATE TABLE'))
    const indexStatements = statements.filter(s => s.includes('CREATE INDEX') || s.includes('CREATE UNIQUE INDEX'))

    // Should have 6 tables
    expect(tableStatements.length).toBe(6)
    // Should have multiple indexes
    expect(indexStatements.length).toBeGreaterThan(10)
  })

  it('getCoreSchemaStatements returns only core tables', () => {
    const statements = getCoreSchemaStatements()
    const tableStatements = statements.filter(s => s.includes('CREATE TABLE'))

    // Should have 4 core tables
    expect(tableStatements.length).toBe(4)
    expect(tableStatements.some(s => s.includes('things'))).toBe(true)
    expect(tableStatements.some(s => s.includes('relationships'))).toBe(true)
    expect(tableStatements.some(s => s.includes('search'))).toBe(true)
    expect(tableStatements.some(s => s.includes('actions'))).toBe(true)
  })

  it('getTableSchema returns correct schema', () => {
    expect(getTableSchema('things')).toBe(THINGS_SCHEMA)
    expect(getTableSchema('relationships')).toBe(RELATIONSHIPS_SCHEMA)
    expect(getTableSchema('search')).toBe(SEARCH_SCHEMA)
    expect(getTableSchema('actions')).toBe(ACTIONS_SCHEMA)
    expect(getTableSchema('events')).toBe(EVENTS_SCHEMA)
    expect(getTableSchema('artifacts')).toBe(ARTIFACTS_SCHEMA)
  })

  it('getTableIndexes returns correct indexes', () => {
    expect(getTableIndexes('things')).toBe(THINGS_INDEXES)
    expect(getTableIndexes('relationships')).toBe(RELATIONSHIPS_INDEXES)
    expect(getTableIndexes('search')).toBe(SEARCH_INDEXES)
    expect(getTableIndexes('actions')).toBe(ACTIONS_INDEXES)
    expect(getTableIndexes('events')).toBe(EVENTS_INDEXES)
    expect(getTableIndexes('artifacts')).toBe(ARTIFACTS_INDEXES)
  })

  it('parseSchemaStatements splits by semicolon', () => {
    const sql = 'CREATE TABLE foo (id INT); CREATE INDEX idx ON foo(id);'
    const statements = parseSchemaStatements(sql)
    expect(statements.length).toBe(2)
    expect(statements[0]).toContain('CREATE TABLE')
    expect(statements[1]).toContain('CREATE INDEX')
  })

  it('parseSchemaStatements filters empty and comments', () => {
    const sql = 'CREATE TABLE foo (id INT); -- comment\n; ;'
    const statements = parseSchemaStatements(sql)
    expect(statements.length).toBe(1)
  })
})

// =============================================================================
// SQL Syntax Tests
// =============================================================================

describe('SQL Syntax', () => {
  const schemas = [
    { name: 'Things', schema: THINGS_SCHEMA },
    { name: 'Relationships', schema: RELATIONSHIPS_SCHEMA },
    { name: 'Search', schema: SEARCH_SCHEMA },
    { name: 'Actions', schema: ACTIONS_SCHEMA },
    { name: 'Events', schema: EVENTS_SCHEMA },
    { name: 'Artifacts', schema: ARTIFACTS_SCHEMA },
  ]

  for (const { name, schema } of schemas) {
    describe(name, () => {
      it('has valid CREATE TABLE syntax', () => {
        expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS \w+/)
      })

      it('has balanced parentheses', () => {
        const openParens = (schema.match(/\(/g) || []).length
        const closeParens = (schema.match(/\)/g) || []).length
        expect(openParens).toBe(closeParens)
      })

      it('ends with closing parenthesis', () => {
        const trimmed = schema.trim()
        expect(trimmed.endsWith(')')).toBe(true)
      })

      it('uses SQLite datetime defaults', () => {
        if (schema.includes('created_at') || schema.includes('timestamp')) {
          expect(schema).toContain("datetime('now')")
        }
      })
    })
  }

  const indexes = [
    { name: 'Things', indexes: THINGS_INDEXES },
    { name: 'Relationships', indexes: RELATIONSHIPS_INDEXES },
    { name: 'Search', indexes: SEARCH_INDEXES },
    { name: 'Actions', indexes: ACTIONS_INDEXES },
    { name: 'Events', indexes: EVENTS_INDEXES },
    { name: 'Artifacts', indexes: ARTIFACTS_INDEXES },
  ]

  for (const { name, indexes: indexStr } of indexes) {
    describe(`${name} Indexes`, () => {
      it('has valid CREATE INDEX syntax', () => {
        expect(indexStr).toMatch(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/)
      })

      it('references correct table', () => {
        const tableName = name.toLowerCase()
        // relationships uses 'rel' prefix
        if (tableName === 'relationships') {
          expect(indexStr).toContain('relationships(')
        } else {
          expect(indexStr).toContain(`${tableName}(`)
        }
      })
    })
  }
})

// =============================================================================
// Type Exports Tests
// =============================================================================

describe('Type Exports', () => {
  it('exports TableName type via TABLES array', () => {
    // Type check - this would fail to compile if wrong
    const tables: readonly string[] = TABLES
    expect(tables.length).toBe(6)
  })

  it('exports ActionStatus type via ACTION_STATUSES array', () => {
    const statuses: readonly string[] = ACTION_STATUSES
    expect(statuses.length).toBe(5)
  })

  it('exports ArtifactType type via ARTIFACT_TYPES array', () => {
    const types: readonly string[] = ARTIFACT_TYPES
    expect(types.length).toBeGreaterThan(10)
  })

  it('exports RelationshipType type via RELATIONSHIP_TYPES array', () => {
    const types: readonly string[] = RELATIONSHIP_TYPES
    expect(types.length).toBeGreaterThan(5)
  })

  it('exports ThingEvent type via THING_EVENTS array', () => {
    const events: readonly string[] = THING_EVENTS
    expect(events.length).toBe(3)
  })
})
