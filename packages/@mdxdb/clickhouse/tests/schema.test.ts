/**
 * Schema Tests
 *
 * Tests for ClickHouse table schemas, column definitions, and SQL generation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Schema exports
  FULL_SCHEMA,
  SCHEMA_VERSION,
  TABLES,
  TABLE_SCHEMAS,
  getAllSchemaStatements,
  // Individual schemas
  THINGS_SCHEMA,
  THINGS_TABLE,
  THINGS_COLUMNS,
  RELATIONSHIPS_SCHEMA,
  RELATIONSHIPS_TABLE,
  RELATIONSHIPS_COLUMNS,
  EVENTS_SCHEMA,
  EVENTS_TABLE,
  EVENTS_COLUMNS,
  ACTIONS_SCHEMA,
  ACTIONS_TABLE,
  ACTIONS_COLUMNS,
  ACTION_STATUSES,
  PUBLISH_ACTIONS,
  ARTIFACTS_SCHEMA,
  ARTIFACTS_TABLE,
  ARTIFACTS_COLUMNS,
  ARTIFACT_TYPES,
  BUILD_STATUSES,
  SEARCH_SCHEMA,
  SEARCH_TABLE,
  SEARCH_COLUMNS,
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
    expect(TABLES).toContain('Things')
    expect(TABLES).toContain('Relationships')
    expect(TABLES).toContain('Events')
    expect(TABLES).toContain('Actions')
    expect(TABLES).toContain('Artifacts')
    expect(TABLES).toContain('Search')
  })

  it('has TABLE_SCHEMAS for all tables', () => {
    for (const table of TABLES) {
      expect(TABLE_SCHEMAS).toHaveProperty(table)
      // access_control has roles/grants, not CREATE TABLE
      if (table === 'access_control') {
        expect(TABLE_SCHEMAS[table]).toContain('CREATE ROLE')
      } else {
        expect(TABLE_SCHEMAS[table]).toContain('CREATE TABLE')
      }
    }
  })
})

// =============================================================================
// Things Schema Tests
// =============================================================================

describe('Things Schema', () => {
  it('has valid table name', () => {
    expect(THINGS_TABLE).toBe('Things')
  })

  it('creates table with correct structure', () => {
    expect(THINGS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Things')
    expect(THINGS_SCHEMA).toContain('ReplacingMergeTree')
    expect(THINGS_SCHEMA).toContain('ORDER BY')
    expect(THINGS_SCHEMA).toContain('PRIMARY KEY')
  })

  it('has required columns', () => {
    const requiredColumns = ['url', 'ns', 'type', 'id', 'branch', 'version', 'data', 'content', 'ts']
    for (const col of requiredColumns) {
      expect(THINGS_COLUMNS).toHaveProperty(col)
    }
  })

  it('has url as primary identifier', () => {
    expect(THINGS_SCHEMA).toContain('url String')
    expect(THINGS_COLUMNS.url).toContain('String')
  })

  it('has version for optimistic locking', () => {
    expect(THINGS_SCHEMA).toContain('version UInt64')
    expect(THINGS_COLUMNS.version).toContain('UInt64')
  })

  it('has JSON data column', () => {
    expect(THINGS_SCHEMA).toContain('data JSON')
    expect(THINGS_COLUMNS.data).toBe('JSON')
  })

  it('has git integration fields', () => {
    expect(THINGS_COLUMNS).toHaveProperty('repo')
    expect(THINGS_COLUMNS).toHaveProperty('branch')
    expect(THINGS_COLUMNS).toHaveProperty('commit')
  })

  it('has visibility and event fields', () => {
    expect(THINGS_COLUMNS).toHaveProperty('visibility')
    expect(THINGS_COLUMNS).toHaveProperty('event')
  })

  it('uses LowCardinality for low-entropy strings', () => {
    expect(THINGS_COLUMNS.ns).toContain('LowCardinality')
    expect(THINGS_COLUMNS.type).toContain('LowCardinality')
    expect(THINGS_COLUMNS.branch).toContain('LowCardinality')
  })

  it('has indexes for common queries', () => {
    expect(THINGS_SCHEMA).toContain('INDEX')
  })
})

// =============================================================================
// Relationships Schema Tests
// =============================================================================

describe('Relationships Schema', () => {
  it('has valid table name', () => {
    expect(RELATIONSHIPS_TABLE).toBe('Relationships')
  })

  it('creates table with correct structure', () => {
    expect(RELATIONSHIPS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Relationships')
    expect(RELATIONSHIPS_SCHEMA).toContain('MergeTree')
  })

  it('has semantic predicate fields', () => {
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('from')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('to')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('predicate')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('reverse')
  })

  it('has namespace for multi-tenancy', () => {
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('ns')
    expect(RELATIONSHIPS_COLUMNS.ns).toContain('LowCardinality')
  })

  it('has data and meta JSON fields', () => {
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('data')
    expect(RELATIONSHIPS_COLUMNS).toHaveProperty('meta')
  })
})

// =============================================================================
// Events Schema Tests
// =============================================================================

describe('Events Schema', () => {
  it('has valid table name', () => {
    expect(EVENTS_TABLE).toBe('Events')
  })

  it('creates table with correct structure', () => {
    expect(EVENTS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Events')
    expect(EVENTS_SCHEMA).toContain('MergeTree')
  })

  it('has Actor-Event-Object-Result pattern fields', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('actor')
    expect(EVENTS_COLUMNS).toHaveProperty('actorData')
    expect(EVENTS_COLUMNS).toHaveProperty('event')
    expect(EVENTS_COLUMNS).toHaveProperty('object')
    expect(EVENTS_COLUMNS).toHaveProperty('objectData')
    expect(EVENTS_COLUMNS).toHaveProperty('result')
    expect(EVENTS_COLUMNS).toHaveProperty('resultData')
  })

  it('has ULID for unique event ID', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('ulid')
    expect(EVENTS_SCHEMA).toContain('ulid')
  })

  it('has timestamp for ordering', () => {
    expect(EVENTS_COLUMNS).toHaveProperty('ts')
    expect(EVENTS_COLUMNS.ts).toContain('DateTime64')
  })
})

// =============================================================================
// Actions Schema Tests
// =============================================================================

describe('Actions Schema', () => {
  it('has valid table name', () => {
    expect(ACTIONS_TABLE).toBe('Actions')
  })

  it('creates table with correct structure', () => {
    expect(ACTIONS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Actions')
    expect(ACTIONS_SCHEMA).toContain('ReplacingMergeTree')
  })

  it('has linguistic verb conjugations', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('act')
    expect(ACTIONS_COLUMNS).toHaveProperty('action')
    expect(ACTIONS_COLUMNS).toHaveProperty('activity')
    expect(ACTIONS_COLUMNS.act).toContain('LowCardinality')
    expect(ACTIONS_COLUMNS.action).toContain('LowCardinality')
    expect(ACTIONS_COLUMNS.activity).toContain('LowCardinality')
  })

  it('has staged objects for batch processing', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('objects')
    expect(ACTIONS_COLUMNS).toHaveProperty('objectsCount')
    expect(ACTIONS_COLUMNS.objects).toBe('JSON')
    expect(ACTIONS_COLUMNS.objectsCount).toContain('UInt32')
  })

  it('has git integration fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('repo')
    expect(ACTIONS_COLUMNS).toHaveProperty('branch')
    expect(ACTIONS_COLUMNS).toHaveProperty('commit')
    expect(ACTIONS_COLUMNS).toHaveProperty('commitMessage')
    expect(ACTIONS_COLUMNS).toHaveProperty('commitAuthor')
    expect(ACTIONS_COLUMNS).toHaveProperty('commitEmail')
    expect(ACTIONS_COLUMNS).toHaveProperty('commitTs')
    expect(ACTIONS_COLUMNS).toHaveProperty('diff')
  })

  it('has workflow state fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('status')
    expect(ACTIONS_COLUMNS).toHaveProperty('progress')
    expect(ACTIONS_COLUMNS).toHaveProperty('total')
    expect(ACTIONS_COLUMNS).toHaveProperty('result')
    expect(ACTIONS_COLUMNS).toHaveProperty('error')
  })

  it('has execution control fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('priority')
    expect(ACTIONS_COLUMNS).toHaveProperty('attempts')
    expect(ACTIONS_COLUMNS).toHaveProperty('maxAttempts')
    expect(ACTIONS_COLUMNS).toHaveProperty('timeout')
    expect(ACTIONS_COLUMNS).toHaveProperty('ttl')
  })

  it('has batch processing fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('batch')
    expect(ACTIONS_COLUMNS).toHaveProperty('batchIndex')
    expect(ACTIONS_COLUMNS).toHaveProperty('batchTotal')
  })

  it('has hierarchy fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('parent')
    expect(ACTIONS_COLUMNS).toHaveProperty('children')
    expect(ACTIONS_COLUMNS).toHaveProperty('dependencies')
  })

  it('has timestamp fields', () => {
    expect(ACTIONS_COLUMNS).toHaveProperty('scheduledAt')
    expect(ACTIONS_COLUMNS).toHaveProperty('startedAt')
    expect(ACTIONS_COLUMNS).toHaveProperty('completedAt')
    expect(ACTIONS_COLUMNS).toHaveProperty('createdAt')
    expect(ACTIONS_COLUMNS).toHaveProperty('updatedAt')
  })

  it('defines valid action statuses', () => {
    expect(ACTION_STATUSES).toContain('pending')
    expect(ACTION_STATUSES).toContain('active')
    expect(ACTION_STATUSES).toContain('completed')
    expect(ACTION_STATUSES).toContain('failed')
    expect(ACTION_STATUSES).toContain('cancelled')
  })

  it('defines publish action types', () => {
    expect(PUBLISH_ACTIONS).toContain('publish')
    expect(PUBLISH_ACTIONS).toContain('import')
    expect(PUBLISH_ACTIONS).toContain('sync')
    expect(PUBLISH_ACTIONS).toContain('transform')
    expect(PUBLISH_ACTIONS).toContain('index')
    expect(PUBLISH_ACTIONS).toContain('embed')
    expect(PUBLISH_ACTIONS).toContain('build')
  })
})

// =============================================================================
// Artifacts Schema Tests
// =============================================================================

describe('Artifacts Schema', () => {
  it('has valid table name', () => {
    expect(ARTIFACTS_TABLE).toBe('Artifacts')
  })

  it('creates table with correct structure', () => {
    expect(ARTIFACTS_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Artifacts')
    expect(ARTIFACTS_SCHEMA).toContain('MergeTree')
  })

  it('has content storage fields', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('content')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('code')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('path')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('storage')
  })

  it('has metadata fields', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('contentType')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('encoding')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('size')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('hash')
  })

  it('has build tracking fields', () => {
    expect(ARTIFACTS_COLUMNS).toHaveProperty('build')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('status')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('log')
    expect(ARTIFACTS_COLUMNS).toHaveProperty('expires')
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

  it('defines build statuses', () => {
    expect(BUILD_STATUSES).toContain('pending')
    expect(BUILD_STATUSES).toContain('building')
    expect(BUILD_STATUSES).toContain('success')
    expect(BUILD_STATUSES).toContain('failed')
  })
})

// =============================================================================
// Search Schema Tests
// =============================================================================

describe('Search Schema', () => {
  it('has valid table name', () => {
    expect(SEARCH_TABLE).toBe('Search')
  })

  it('creates table with correct structure', () => {
    expect(SEARCH_SCHEMA).toContain('CREATE TABLE IF NOT EXISTS Search')
    expect(SEARCH_SCHEMA).toContain('MergeTree')
  })

  it('has full-text search fields', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('title')
    expect(SEARCH_COLUMNS).toHaveProperty('description')
    expect(SEARCH_COLUMNS).toHaveProperty('content')
    expect(SEARCH_COLUMNS).toHaveProperty('keywords')
  })

  it('has vector embedding support', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('embedding')
    expect(SEARCH_COLUMNS).toHaveProperty('model')
    expect(SEARCH_SCHEMA).toContain('embedding')
  })

  it('has localization fields', () => {
    expect(SEARCH_COLUMNS).toHaveProperty('language')
    expect(SEARCH_COLUMNS).toHaveProperty('locale')
  })

  it('has keywords as array', () => {
    expect(SEARCH_COLUMNS.keywords).toContain('Array')
  })

  it('has HNSW vector similarity index', () => {
    expect(SEARCH_SCHEMA).toContain('vector_similarity')
    expect(SEARCH_SCHEMA).toContain('hnsw')
    expect(SEARCH_SCHEMA).toContain('cosineDistance')
  })

  it('has full-text indexes', () => {
    expect(SEARCH_SCHEMA).toContain('tokenbf_v1')
    expect(SEARCH_SCHEMA).toContain('idx_title')
    expect(SEARCH_SCHEMA).toContain('idx_description')
    expect(SEARCH_SCHEMA).toContain('idx_content')
  })
})

// =============================================================================
// Full Schema Tests
// =============================================================================

describe('Full Schema', () => {
  it('contains all table schemas', () => {
    expect(FULL_SCHEMA).toContain('Things')
    expect(FULL_SCHEMA).toContain('Relationships')
    expect(FULL_SCHEMA).toContain('Events')
    expect(FULL_SCHEMA).toContain('Actions')
    expect(FULL_SCHEMA).toContain('Artifacts')
    expect(FULL_SCHEMA).toContain('Search')
  })

  it('getAllSchemaStatements returns array', () => {
    const statements = getAllSchemaStatements()
    expect(Array.isArray(statements)).toBe(true)
    expect(statements.length).toBeGreaterThan(0)
  })

  it('getAllSchemaStatements returns valid SQL', () => {
    const statements = getAllSchemaStatements()
    for (const stmt of statements) {
      expect(stmt).toContain('CREATE TABLE')
      expect(stmt.trim()).not.toBe('')
    }
  })
})

// =============================================================================
// SQL Syntax Tests
// =============================================================================

describe('SQL Syntax', () => {
  const schemas = [
    { name: 'Things', schema: THINGS_SCHEMA },
    { name: 'Relationships', schema: RELATIONSHIPS_SCHEMA },
    { name: 'Events', schema: EVENTS_SCHEMA },
    { name: 'Actions', schema: ACTIONS_SCHEMA },
    { name: 'Artifacts', schema: ARTIFACTS_SCHEMA },
    { name: 'Search', schema: SEARCH_SCHEMA },
  ]

  for (const { name, schema } of schemas) {
    describe(name, () => {
      it('has valid CREATE TABLE syntax', () => {
        expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS \w+/)
      })

      it('has ENGINE specification', () => {
        expect(schema).toContain('ENGINE =')
      })

      it('has ORDER BY clause', () => {
        expect(schema).toContain('ORDER BY')
      })

      it('has balanced parentheses', () => {
        const openParens = (schema.match(/\(/g) || []).length
        const closeParens = (schema.match(/\)/g) || []).length
        expect(openParens).toBe(closeParens)
      })

      it('ends properly', () => {
        const trimmed = schema.trim()
        // Should end with ) or a closing character
        expect(trimmed.endsWith(')')).toBe(true)
      })
    })
  }
})
