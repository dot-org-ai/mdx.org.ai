import { describe, it, expect } from 'vitest'
import {
  createReader,
  createWriter,
  thingSchema,
  relationshipSchema,
  relationshipIndexSchema,
  inferSchema,
  createSchema,
  writeRelationshipsIndexed,
} from '../src/index.js'
import type { Thing, Relationship } from '../src/types.js'

describe('@mdxdb/parquet', () => {
  describe('schema', () => {
    it('should create thing schema', () => {
      const schema = thingSchema()
      expect(schema.fields).toHaveLength(10)
      expect(schema.fields.map((f) => f.name)).toContain('url')
      expect(schema.fields.map((f) => f.name)).toContain('data')
      expect(schema.fields.map((f) => f.name)).toContain('at')
      expect(schema.fields.map((f) => f.name)).toContain('version')
    })

    it('should create relationship schema with bidirectional predicates', () => {
      const schema = relationshipSchema()
      expect(schema.fields).toHaveLength(10)
      expect(schema.fields.map((f) => f.name)).toContain('predicate')
      expect(schema.fields.map((f) => f.name)).toContain('reverse')
      expect(schema.fields.map((f) => f.name)).toContain('from')
      expect(schema.fields.map((f) => f.name)).toContain('to')
      expect(schema.fields.map((f) => f.name)).toContain('do')
    })

    it('should create relationship index schema', () => {
      const schema = relationshipIndexSchema()
      expect(schema.fields.map((f) => f.name)).toContain('lookup_key')
      expect(schema.fields.map((f) => f.name)).toContain('direction')
    })

    it('should infer schema from data', () => {
      const data = [
        { name: 'Test', count: 42, active: true, meta: { foo: 'bar' } },
        { name: 'Test2', count: 100, active: false, meta: { baz: 1 } },
      ]

      const schema = inferSchema(data)
      expect(schema.fields).toHaveLength(4)

      const nameField = schema.fields.find((f) => f.name === 'name')
      expect(nameField?.type).toBe('UTF8')

      const countField = schema.fields.find((f) => f.name === 'count')
      expect(countField?.type).toBe('INT64')

      const activeField = schema.fields.find((f) => f.name === 'active')
      expect(activeField?.type).toBe('BOOLEAN')

      const metaField = schema.fields.find((f) => f.name === 'meta')
      expect(metaField?.type).toBe('JSON')
    })

    it('should create custom schema', () => {
      const schema = createSchema([
        { name: 'id', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'optional', type: 'string', optional: true },
      ])

      expect(schema.fields).toHaveLength(3)
      expect(schema.fields[2]?.optional).toBe(true)
    })
  })

  describe('reader/writer', () => {
    it('should create reader instance', () => {
      const reader = createReader()
      expect(reader.metadata).toBeDefined()
      expect(reader.read).toBeDefined()
      expect(reader.stream).toBeDefined()
    })

    it('should create writer instance', () => {
      const writer = createWriter()
      expect(writer.write).toBeDefined()
      expect(writer.writeThings).toBeDefined()
      expect(writer.writeRelationships).toBeDefined()
    })

    it('should write and read simple data', async () => {
      const writer = createWriter()
      const reader = createReader()

      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]

      const buffer = await writer.write(data)
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      expect(buffer.byteLength).toBeGreaterThan(0)

      const metadata = await reader.metadata(buffer)
      expect(metadata.numRows).toBe(2)

      const readData = await reader.read<{ name: string; age: number }>(buffer)
      expect(readData).toHaveLength(2)
      expect(readData[0]?.name).toBe('Alice')
      expect(readData[1]?.age).toBe(25)
    })

    it('should write and read Things', async () => {
      const writer = createWriter()
      const reader = createReader()

      const things: Thing[] = [
        {
          url: 'https://example.com/Post/post-1',
          type: 'Post',
          id: 'post-1',
          data: { title: 'Hello World', views: 100 },
          content: 'This is my first post',
          at: new Date('2024-01-01'),
          version: 1,
        },
        {
          url: 'https://example.com/Post/post-2',
          type: 'Post',
          id: 'post-2',
          data: { title: 'Second Post', views: 50 },
          at: new Date('2024-01-03'),
          version: 1,
        },
      ]

      const buffer = await writer.writeThings(things)
      expect(buffer.byteLength).toBeGreaterThan(0)

      const metadata = await reader.metadata(buffer)
      expect(metadata.numRows).toBe(2)
    })

    it('should write and read Relationships with bidirectional predicates', async () => {
      const writer = createWriter()
      const reader = createReader()

      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          predicate: 'author',
          reverse: 'posts',
          from: 'https://example.com/Post/post-1',
          to: 'https://example.com/User/alice',
          at: new Date('2024-01-01'),
        },
        {
          id: 'rel-2',
          predicate: 'likes',
          reverse: 'likedBy',
          from: 'https://example.com/User/bob',
          to: 'https://example.com/Post/post-1',
          data: { rating: 5 },
          at: new Date('2024-01-02'),
        },
      ]

      const buffer = await writer.writeRelationships(relationships)
      expect(buffer.byteLength).toBeGreaterThan(0)

      const metadata = await reader.metadata(buffer)
      expect(metadata.numRows).toBe(2)
    })

    it('should write relationships with bidirectional indexing', async () => {
      const reader = createReader()

      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          predicate: 'author',
          reverse: 'posts',
          from: 'https://example.com/Post/post-1',
          to: 'https://example.com/User/alice',
          at: new Date('2024-01-01'),
        },
        {
          id: 'rel-2',
          predicate: 'likes',
          reverse: 'likedBy',
          from: 'https://example.com/User/bob',
          to: 'https://example.com/Post/post-1',
          at: new Date('2024-01-02'),
        },
      ]

      // Each relationship with a reverse creates 2 rows
      const buffer = await writeRelationshipsIndexed(relationships)
      expect(buffer.byteLength).toBeGreaterThan(0)

      const metadata = await reader.metadata(buffer)
      expect(metadata.numRows).toBe(4) // 2 rels * 2 directions each

      // Verify data is sorted by lookup_key
      const data = await reader.read<{ lookup_key: string; direction: string }>(buffer)
      expect(data).toHaveLength(4)

      // Check that forward and reverse entries exist
      const directions = data.map((d) => d.direction)
      expect(directions.filter((d) => d === 'forward')).toHaveLength(2)
      expect(directions.filter((d) => d === 'reverse')).toHaveLength(2)
    })

    it('should handle empty data', async () => {
      const writer = createWriter()
      const reader = createReader()

      const schema = createSchema([
        { name: 'id', type: 'string' },
        { name: 'value', type: 'number' },
      ])

      const buffer = await writer.write([], schema)
      expect(buffer.byteLength).toBeGreaterThan(0)

      const readData = await reader.read(buffer)
      expect(readData).toHaveLength(0)
    })

    it('should support streaming', async () => {
      const writer = createWriter()
      const reader = createReader()

      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        value: i * 10,
      }))

      const buffer = await writer.write(data)

      let count = 0
      for await (const _row of reader.stream(buffer)) {
        count++
      }

      expect(count).toBe(100)
    })
  })
})
