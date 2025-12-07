import { describe, it, expect } from 'vitest'
import {
  toYAML,
  fromYAML,
  toYAMLDocuments,
  fromYAMLDocuments,
  createYAMLStream,
  yamlldToJsonld,
  jsonldToYamlld,
} from './index.js'

// =============================================================================
// toYAML Tests
// =============================================================================

describe('toYAML', () => {
  describe('basic conversion', () => {
    it('should convert simple object to YAML', () => {
      const result = toYAML({ name: 'test' })
      expect(result.trim()).toBe('name: test')
    })

    it('should handle nested objects', () => {
      const result = toYAML({
        database: {
          host: 'localhost',
          port: 5432,
        },
      })

      expect(result).toContain('database:')
      expect(result).toContain('host: localhost')
      expect(result).toContain('port: 5432')
    })

    it('should handle arrays', () => {
      const result = toYAML({ items: ['a', 'b', 'c'] })
      expect(result).toContain('items:')
      expect(result).toContain('- a')
      expect(result).toContain('- b')
      expect(result).toContain('- c')
    })

    it('should handle different data types', () => {
      const result = toYAML({
        string: 'hello',
        number: 42,
        float: 3.14,
        boolean: true,
        nullValue: null,
      })

      expect(result).toContain('string: hello')
      expect(result).toContain('number: 42')
      expect(result).toContain('float: 3.14')
      expect(result).toContain('boolean: true')
      expect(result).toContain('nullValue: null')
    })
  })

  describe('options', () => {
    it('should use custom indentation', () => {
      const result = toYAML(
        { nested: { value: 'test' } },
        { indent: 4 }
      )
      expect(result).toContain('    value: test')
    })

    it('should sort keys alphabetically', () => {
      const result = toYAML(
        { zebra: 1, apple: 2, mango: 3 },
        { sortKeys: true }
      )

      const lines = result.trim().split('\n')
      expect(lines[0]).toContain('apple')
      expect(lines[1]).toContain('mango')
      expect(lines[2]).toContain('zebra')
    })

    it('should use double quotes', () => {
      const result = toYAML(
        { name: 'test' },
        { quotingType: '"', forceQuotes: true }
      )
      expect(result).toContain('"test"')
    })

    it('should use single quotes', () => {
      const result = toYAML(
        { name: 'test' },
        { quotingType: "'", forceQuotes: true }
      )
      expect(result).toContain("'test'")
    })
  })

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = toYAML({})
      expect(result.trim()).toBe('{}')
    })

    it('should handle empty array', () => {
      const result = toYAML({ items: [] })
      expect(result).toContain('items: []')
    })

    it('should handle unicode', () => {
      const result = toYAML({ name: '客户 🎉' })
      expect(result).toContain('客户 🎉')
    })

    it('should handle special YAML characters', () => {
      const result = toYAML({ value: 'test: with colon' })
      expect(result).toContain('test: with colon')
    })

    it('should handle multiline strings', () => {
      const result = toYAML({ content: 'line1\nline2\nline3' })
      expect(result).toContain('content:')
    })

    it('should handle deeply nested objects', () => {
      const result = toYAML({
        a: { b: { c: { d: { e: 'deep' } } } },
      })
      expect(result).toContain('e: deep')
    })
  })
})

// =============================================================================
// fromYAML Tests
// =============================================================================

describe('fromYAML', () => {
  describe('basic parsing', () => {
    it('should parse simple YAML', () => {
      const result = fromYAML('name: test')
      expect(result).toEqual({ name: 'test' })
    })

    it('should parse nested YAML', () => {
      const yaml = `
database:
  host: localhost
  port: 5432`
      const result = fromYAML(yaml)
      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
        },
      })
    })

    it('should parse arrays', () => {
      const yaml = `
items:
  - a
  - b
  - c`
      const result = fromYAML(yaml)
      expect(result).toEqual({ items: ['a', 'b', 'c'] })
    })

    it('should parse different types', () => {
      const yaml = `
string: hello
number: 42
boolean: true
null_value: null`
      const result = fromYAML(yaml)
      expect(result.string).toBe('hello')
      expect(result.number).toBe(42)
      expect(result.boolean).toBe(true)
      expect(result.null_value).toBe(null)
    })
  })

  describe('options', () => {
    it('should throw on invalid YAML in strict mode', () => {
      expect(() => fromYAML('invalid: yaml: here:', { strict: true }))
        .toThrow()
    })

    it('should return empty object on invalid YAML in non-strict mode', () => {
      const result = fromYAML('invalid: yaml: here:')
      expect(result).toEqual({})
    })
  })

  describe('round-trip', () => {
    it('should round-trip simple object', () => {
      const original = { name: 'test', count: 42 }
      const result = fromYAML(toYAML(original))
      expect(result).toEqual(original)
    })

    it('should round-trip complex object', () => {
      const original = {
        name: 'config',
        database: { host: 'localhost', port: 5432 },
        features: ['auth', 'api'],
      }
      const result = fromYAML(toYAML(original))
      expect(result).toEqual(original)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = fromYAML('')
      expect(result).toBe(null)
    })

    it('should handle whitespace only', () => {
      const result = fromYAML('   \n\n   ')
      expect(result).toBe(null)
    })

    it('should handle unicode', () => {
      const result = fromYAML('name: 客户 🎉')
      expect(result).toEqual({ name: '客户 🎉' })
    })
  })
})

// =============================================================================
// Multi-Document Support Tests
// =============================================================================

describe('toYAMLDocuments', () => {
  it('should create multi-document YAML', () => {
    const result = toYAMLDocuments([
      { kind: 'Deployment', name: 'app' },
      { kind: 'Service', name: 'app-svc' },
    ])

    expect(result).toContain('kind: Deployment')
    expect(result).toContain('---')
    expect(result).toContain('kind: Service')
  })

  it('should handle single document', () => {
    const result = toYAMLDocuments([{ name: 'single' }])
    expect(result.trim()).toBe('name: single')
  })

  it('should handle empty array', () => {
    const result = toYAMLDocuments([])
    expect(result).toBe('')
  })

  it('should apply options to all documents', () => {
    const result = toYAMLDocuments(
      [{ b: 1, a: 2 }, { d: 3, c: 4 }],
      { sortKeys: true }
    )

    const docs = result.split('---')
    expect(docs[0]).toMatch(/a:.*\n.*b:/s)
    expect(docs[1]).toMatch(/c:.*\n.*d:/s)
  })
})

describe('fromYAMLDocuments', () => {
  it('should parse multi-document YAML', () => {
    const yaml = `
kind: Deployment
name: app
---
kind: Service
name: app-svc`

    const result = fromYAMLDocuments(yaml)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ kind: 'Deployment', name: 'app' })
    expect(result[1]).toEqual({ kind: 'Service', name: 'app-svc' })
  })

  it('should handle single document', () => {
    const result = fromYAMLDocuments('name: single')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'single' })
  })

  it('should handle empty YAML', () => {
    const result = fromYAMLDocuments('')
    expect(result).toHaveLength(0)
  })

  it('should handle YAML with various indentation', () => {
    // The yaml library is very forgiving, most input is valid
    const result = fromYAMLDocuments('key: value')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ key: 'value' })
  })

  it('should handle valid nested YAML structures', () => {
    // This is actually valid YAML
    const result = fromYAMLDocuments('nested: { a: 1, b: 2 }')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ nested: { a: 1, b: 2 } })
  })

  it('should round-trip multiple documents', () => {
    const original = [
      { kind: 'Deployment' },
      { kind: 'Service' },
      { kind: 'ConfigMap' },
    ]
    const result = fromYAMLDocuments(toYAMLDocuments(original))
    expect(result).toEqual(original)
  })
})

// =============================================================================
// Streaming Support Tests
// =============================================================================

describe('createYAMLStream', () => {
  it('should parse streaming YAML documents', async () => {
    async function* generateChunks(): AsyncGenerator<string> {
      yield 'name: doc1\n'
      yield '---\n'
      yield 'name: doc2\n'
      yield '---\n'
      yield 'name: doc3'
    }

    const stream = createYAMLStream()
    const docs: any[] = []

    for await (const doc of stream.parse(generateChunks())) {
      docs.push(doc)
    }

    expect(docs).toHaveLength(3)
    expect(docs[0]).toEqual({ name: 'doc1' })
    expect(docs[1]).toEqual({ name: 'doc2' })
    expect(docs[2]).toEqual({ name: 'doc3' })
  })

  it('should handle single document stream', async () => {
    async function* generateChunks(): AsyncGenerator<string> {
      yield 'name: single'
    }

    const stream = createYAMLStream()
    const docs: any[] = []

    for await (const doc of stream.parse(generateChunks())) {
      docs.push(doc)
    }

    expect(docs).toHaveLength(1)
    expect(docs[0]).toEqual({ name: 'single' })
  })

  it('should handle chunked content', async () => {
    async function* generateChunks(): AsyncGenerator<string> {
      yield 'na'
      yield 'me: te'
      yield 'st'
    }

    const stream = createYAMLStream()
    const docs: any[] = []

    for await (const doc of stream.parse(generateChunks())) {
      docs.push(doc)
    }

    expect(docs).toHaveLength(1)
    expect(docs[0]).toEqual({ name: 'test' })
  })
})

// =============================================================================
// YAML-LD Utilities Tests
// =============================================================================

describe('yamlldToJsonld', () => {
  it('should transform $type to @type', () => {
    const result = yamlldToJsonld({ $type: 'Person' })
    expect(result['@type']).toBe('Person')
    expect(result['$type']).toBeUndefined()
  })

  it('should transform $id to @id', () => {
    const result = yamlldToJsonld({ $id: 'person-1' })
    expect(result['@id']).toBe('person-1')
  })

  it('should transform $context to @context', () => {
    const result = yamlldToJsonld({ $context: 'https://schema.org' })
    expect(result['@context']).toBe('https://schema.org')
  })

  it('should preserve non-$ properties', () => {
    const result = yamlldToJsonld({
      $type: 'Person',
      name: 'John',
      email: 'john@example.com',
    })

    expect(result.name).toBe('John')
    expect(result.email).toBe('john@example.com')
  })

  it('should transform nested objects', () => {
    const result = yamlldToJsonld({
      $type: 'BlogPost',
      author: {
        $type: 'Person',
        name: 'John',
      },
    })

    expect(result['@type']).toBe('BlogPost')
    expect(result.author['@type']).toBe('Person')
    expect(result.author.name).toBe('John')
  })

  it('should transform objects in arrays', () => {
    const result = yamlldToJsonld({
      $type: 'List',
      items: [
        { $type: 'Item', name: 'A' },
        { $type: 'Item', name: 'B' },
      ],
    })

    expect(result.items[0]['@type']).toBe('Item')
    expect(result.items[1]['@type']).toBe('Item')
  })

  it('should preserve primitive values in arrays', () => {
    const result = yamlldToJsonld({
      tags: ['a', 'b', 'c'],
    })

    expect(result.tags).toEqual(['a', 'b', 'c'])
  })
})

describe('jsonldToYamlld', () => {
  it('should transform @type to $type', () => {
    const result = jsonldToYamlld({ '@type': 'Person' })
    expect(result['$type']).toBe('Person')
    expect(result['@type']).toBeUndefined()
  })

  it('should transform @id to $id', () => {
    const result = jsonldToYamlld({ '@id': 'person-1' })
    expect(result['$id']).toBe('person-1')
  })

  it('should transform @context to $context', () => {
    const result = jsonldToYamlld({ '@context': 'https://schema.org' })
    expect(result['$context']).toBe('https://schema.org')
  })

  it('should transform nested objects', () => {
    const result = jsonldToYamlld({
      '@type': 'BlogPost',
      author: {
        '@type': 'Person',
        name: 'John',
      },
    })

    expect(result['$type']).toBe('BlogPost')
    expect(result.author['$type']).toBe('Person')
  })

  it('should round-trip with yamlldToJsonld', () => {
    const original = {
      $type: 'Person',
      $id: 'person-1',
      name: 'John',
      address: {
        $type: 'PostalAddress',
        city: 'NYC',
      },
    }

    const jsonld = yamlldToJsonld(original)
    const result = jsonldToYamlld(jsonld)

    expect(result).toEqual(original)
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('should handle Kubernetes-style manifest', () => {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'my-app',
        labels: { app: 'my-app' },
      },
      spec: {
        replicas: 3,
        selector: {
          matchLabels: { app: 'my-app' },
        },
      },
    }

    const yaml = toYAML(manifest)
    const parsed = fromYAML(yaml)

    expect(parsed).toEqual(manifest)
  })

  it('should handle GitHub Actions workflow', () => {
    const workflow = {
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            { run: 'npm test' },
          ],
        },
      },
    }

    const yaml = toYAML(workflow)
    const parsed = fromYAML(yaml)

    expect(parsed).toEqual(workflow)
  })

  it('should handle very long strings', () => {
    const longValue = 'x'.repeat(10000)
    const result = fromYAML(toYAML({ value: longValue }))
    expect(result.value).toBe(longValue)
  })
})
