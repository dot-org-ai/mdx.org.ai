/**
 * Schema Tests (node pool)
 *
 * Tests for the _data / _rels SQLite schema and SQL statement generation.
 */

import { describe, it, expect } from 'vitest'
import {
  DATA_TABLE,
  RELS_TABLE,
  DATA_SCHEMA,
  DATA_INDEXES,
  RELS_SCHEMA,
  RELS_INDEXES,
  TABLES,
  SCHEMA_VERSION,
  getAllSchemaStatements,
} from '../src/schema/index.js'

const DATA_COLUMNS = [
  'url', 'type', 'id', 'data', 'content', 'context', 'code', 'hash', 'at', 'by', '"in"', 'version',
]
const RELS_COLUMNS = ['id', 'predicate', 'reverse', '"from"', '"to"', 'data', 'at', 'by', '"in"', 'do']

describe('Schema Version', () => {
  it('has a positive numeric version', () => {
    expect(typeof SCHEMA_VERSION).toBe('number')
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
  })
})

describe('Tables', () => {
  it('exposes exactly the _data and _rels tables', () => {
    expect(DATA_TABLE).toBe('_data')
    expect(RELS_TABLE).toBe('_rels')
    expect([...TABLES]).toEqual(['_data', '_rels'])
  })
})

describe('_data schema', () => {
  it('creates the _data table idempotently', () => {
    expect(DATA_SCHEMA).toMatch(/^CREATE TABLE IF NOT EXISTS _data \(/)
  })

  it('declares every column', () => {
    for (const col of DATA_COLUMNS) {
      expect(DATA_SCHEMA).toContain(`${col} `)
    }
  })

  it('uses url as the primary key', () => {
    expect(DATA_SCHEMA).toContain('url TEXT PRIMARY KEY')
  })

  it('defaults data to an empty object and version to 1', () => {
    expect(DATA_SCHEMA).toContain("data TEXT NOT NULL DEFAULT '{}'")
    expect(DATA_SCHEMA).toContain('version INTEGER NOT NULL DEFAULT 1')
  })

  it('indexes type, (type,id), at and hash', () => {
    expect(DATA_INDEXES).toContain('idx_data_type ON _data(type)')
    expect(DATA_INDEXES).toContain('idx_data_type_id ON _data(type, id)')
    expect(DATA_INDEXES).toContain('idx_data_at ON _data(at)')
    expect(DATA_INDEXES).toContain('idx_data_hash ON _data(hash)')
  })
})

describe('_rels schema', () => {
  it('creates the _rels table idempotently', () => {
    expect(RELS_SCHEMA).toMatch(/^CREATE TABLE IF NOT EXISTS _rels \(/)
  })

  it('declares every column', () => {
    for (const col of RELS_COLUMNS) {
      expect(RELS_SCHEMA).toContain(`${col} `)
    }
  })

  it('requires predicate, from and to; reverse is optional', () => {
    expect(RELS_SCHEMA).toContain('predicate TEXT NOT NULL')
    expect(RELS_SCHEMA).toContain('"from" TEXT NOT NULL')
    expect(RELS_SCHEMA).toContain('"to" TEXT NOT NULL')
    expect(RELS_SCHEMA).toMatch(/reverse TEXT,/)
  })

  it('cascades deletes from _data', () => {
    expect(RELS_SCHEMA).toContain('FOREIGN KEY ("from") REFERENCES _data(url) ON DELETE CASCADE')
  })

  it('indexes both directions and enforces uniqueness per edge', () => {
    expect(RELS_INDEXES).toContain('idx_rels_from ON _rels("from")')
    expect(RELS_INDEXES).toContain('idx_rels_to ON _rels("to")')
    expect(RELS_INDEXES).toContain('idx_rels_from_predicate ON _rels("from", predicate)')
    expect(RELS_INDEXES).toContain('idx_rels_to_reverse ON _rels("to", reverse)')
    expect(RELS_INDEXES).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_rels_unique ON _rels("from", predicate, "to")'
    )
  })
})

describe('getAllSchemaStatements', () => {
  const statements = getAllSchemaStatements()

  it('returns one statement per table and index', () => {
    const dataIndexCount = DATA_INDEXES.split(';').filter((s) => s.trim()).length
    const relsIndexCount = RELS_INDEXES.split(';').filter((s) => s.trim()).length
    expect(statements.length).toBe(2 + dataIndexCount + relsIndexCount)
  })

  it('creates tables before their indexes', () => {
    const dataTable = statements.indexOf(DATA_SCHEMA)
    const relsTable = statements.indexOf(RELS_SCHEMA)
    const firstDataIndex = statements.findIndex((s) => s.includes('ON _data('))
    const firstRelsIndex = statements.findIndex((s) => s.includes('ON _rels('))
    expect(dataTable).toBeGreaterThanOrEqual(0)
    expect(relsTable).toBeGreaterThan(dataTable)
    expect(firstDataIndex).toBeGreaterThan(dataTable)
    expect(firstRelsIndex).toBeGreaterThan(relsTable)
  })

  it('emits single trimmed statements without trailing semicolons', () => {
    for (const s of statements) {
      expect(s).toBe(s.trim())
      expect(s).not.toContain(';')
      expect(s.length).toBeGreaterThan(0)
    }
  })

  it('only uses IF NOT EXISTS so re-running is safe', () => {
    for (const s of statements) {
      expect(s).toMatch(/^CREATE (TABLE|INDEX|UNIQUE INDEX) IF NOT EXISTS /)
    }
  })
})
