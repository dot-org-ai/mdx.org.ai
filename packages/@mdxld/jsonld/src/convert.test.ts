import { describe, it, expect } from 'vitest'
import {
  fromJsonLD,
  toJsonLD,
  extractGraph,
  findByType,
  findById,
  filterGraph,
  transform,
} from './convert.js'
import {
  extractLocalName,
  extractRef,
  simplifyPropertyName,
} from './utils.js'

describe('fromJsonLD', () => {
  it('converts basic JSON-LD keywords to MDXLD', () => {
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': 'https://example.com/alice',
      name: 'Alice',
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $context: 'https://schema.org',
      $type: 'Person',
      $id: 'https://example.com/alice',
      name: 'Alice',
    })
  })

  it('extracts local name from full type URIs', () => {
    const jsonld = {
      '@type': 'https://schema.org/Person',
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: 'Person',
    })
  })

  it('handles array types', () => {
    const jsonld = {
      '@type': ['https://schema.org/Person', 'https://schema.org/Author'],
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: ['Person', 'Author'],
    })
  })

  it('simplifies RDF property names', () => {
    const jsonld = {
      '@type': 'rdfs:Class',
      'rdfs:label': 'Person',
      'rdfs:comment': 'A person',
      'rdfs:subClassOf': { '@id': 'https://schema.org/Thing' },
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: 'Class',
      label: 'Person',
      description: 'A person',
      subClassOf: 'Thing',
    })
  })

  it('extracts references from objects with only @id', () => {
    const jsonld = {
      '@type': 'Person',
      parent: { '@id': 'https://schema.org/Person' },
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: 'Person',
      parent: 'Person',
    })
  })

  it('handles nested objects', () => {
    const jsonld = {
      '@type': 'Person',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
      },
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: 'Person',
      address: {
        $type: 'PostalAddress',
        streetAddress: '123 Main St',
      },
    })
  })

  it('handles arrays of objects', () => {
    const jsonld = {
      '@type': 'Person',
      knows: [
        { '@type': 'Person', name: 'Bob' },
        { '@type': 'Person', name: 'Charlie' },
      ],
    }

    const result = fromJsonLD(jsonld)

    expect(result).toEqual({
      $type: 'Person',
      knows: [
        { $type: 'Person', name: 'Bob' },
        { $type: 'Person', name: 'Charlie' },
      ],
    })
  })

  it('strips base URL from IDs when provided', () => {
    const jsonld = {
      '@id': 'https://schema.org/Person',
      '@type': 'Class',
    }

    const result = fromJsonLD(jsonld, { baseUrl: 'https://schema.org/' })

    expect(result).toEqual({
      $id: 'Person',
      $type: 'Class',
    })
  })

  it('can disable property simplification', () => {
    const jsonld = {
      'rdfs:label': 'Person',
    }

    const result = fromJsonLD(jsonld, { simplifyProperties: false })

    expect(result).toEqual({
      'rdfs:label': 'Person',
    })
  })

  it('can disable reference extraction', () => {
    const jsonld = {
      parent: { '@id': 'https://schema.org/Thing' },
    }

    const result = fromJsonLD(jsonld, { extractRefs: false })

    expect(result).toEqual({
      parent: { $id: 'https://schema.org/Thing' },
    })
  })

  it('handles schema.org vocabulary structure', () => {
    const jsonld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@id': 'https://schema.org/Person',
          '@type': 'rdfs:Class',
          'rdfs:label': 'Person',
          'rdfs:comment': 'A person (alive, dead, undead, or fictional).',
          'rdfs:subClassOf': { '@id': 'https://schema.org/Thing' },
        },
        {
          '@id': 'https://schema.org/name',
          '@type': 'rdf:Property',
          'rdfs:label': 'name',
          'schema:domainIncludes': { '@id': 'https://schema.org/Thing' },
          'schema:rangeIncludes': { '@id': 'https://schema.org/Text' },
        },
      ],
    }

    const result = fromJsonLD(jsonld)

    expect(result.$context).toBe('https://schema.org')
    expect(result.$graph).toHaveLength(2)
    expect((result.$graph as unknown[])[0]).toEqual({
      $id: 'https://schema.org/Person',
      $type: 'Class',
      label: 'Person',
      description: 'A person (alive, dead, undead, or fictional).',
      subClassOf: 'Thing',
    })
  })
})

describe('toJsonLD', () => {
  it('converts MDXLD keywords to JSON-LD', () => {
    const mdxld = {
      $context: 'https://schema.org',
      $type: 'Person',
      $id: '/alice',
      name: 'Alice',
    }

    const result = toJsonLD(mdxld)

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': '/alice',
      name: 'Alice',
    })
  })

  it('handles nested objects', () => {
    const mdxld = {
      $type: 'Person',
      address: {
        $type: 'PostalAddress',
        streetAddress: '123 Main St',
      },
    }

    const result = toJsonLD(mdxld)

    expect(result).toEqual({
      '@type': 'Person',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
      },
    })
  })

  it('handles $graph', () => {
    const mdxld = {
      $context: 'https://schema.org',
      $graph: [
        { $type: 'Person', name: 'Alice' },
        { $type: 'Person', name: 'Bob' },
      ],
    }

    const result = toJsonLD(mdxld)

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Person', name: 'Alice' },
        { '@type': 'Person', name: 'Bob' },
      ],
    })
  })
})

describe('extractGraph', () => {
  it('extracts and converts @graph entities', () => {
    const jsonld = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Person', '@id': '/alice', name: 'Alice' },
        { '@type': 'Person', '@id': '/bob', name: 'Bob' },
      ],
    }

    const result = extractGraph(jsonld)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      $type: 'Person',
      $id: '/alice',
      name: 'Alice',
    })
    expect(result[1]).toEqual({
      $type: 'Person',
      $id: '/bob',
      name: 'Bob',
    })
  })

  it('returns empty array for documents without @graph', () => {
    const jsonld = {
      '@type': 'Person',
      name: 'Alice',
    }

    const result = extractGraph(jsonld)

    expect(result).toEqual([])
  })
})

describe('findByType', () => {
  it('finds entity by type', () => {
    const jsonld = {
      '@graph': [
        { '@type': 'Person', name: 'Alice' },
        { '@type': 'Organization', name: 'Acme' },
      ],
    }

    const result = findByType(jsonld, 'Person')

    expect(result).toEqual({
      $type: 'Person',
      name: 'Alice',
    })
  })

  it('finds entity by extracted type name', () => {
    const jsonld = {
      '@graph': [
        { '@type': 'https://schema.org/Person', name: 'Alice' },
      ],
    }

    const result = findByType(jsonld, 'Person')

    expect(result).toEqual({
      $type: 'Person',
      name: 'Alice',
    })
  })

  it('returns undefined if type not found', () => {
    const jsonld = {
      '@graph': [
        { '@type': 'Organization', name: 'Acme' },
      ],
    }

    const result = findByType(jsonld, 'Person')

    expect(result).toBeUndefined()
  })

  it('checks document type if no @graph', () => {
    const jsonld = {
      '@type': 'Person',
      name: 'Alice',
    }

    const result = findByType(jsonld, 'Person')

    expect(result).toEqual({
      $type: 'Person',
      name: 'Alice',
    })
  })
})

describe('findById', () => {
  it('finds entity by exact ID', () => {
    const jsonld = {
      '@graph': [
        { '@id': 'https://example.com/alice', '@type': 'Person', name: 'Alice' },
        { '@id': 'https://example.com/bob', '@type': 'Person', name: 'Bob' },
      ],
    }

    const result = findById(jsonld, 'https://example.com/alice')

    expect(result).toEqual({
      $id: 'https://example.com/alice',
      $type: 'Person',
      name: 'Alice',
    })
  })

  it('finds entity by ID suffix', () => {
    const jsonld = {
      '@graph': [
        { '@id': 'https://schema.org/Person', '@type': 'rdfs:Class' },
      ],
    }

    const result = findById(jsonld, '/Person')

    expect(result).toEqual({
      $id: 'https://schema.org/Person',
      $type: 'Class',
    })
  })
})

describe('filterGraph', () => {
  it('filters entities by predicate', () => {
    const jsonld = {
      '@graph': [
        { '@type': 'rdf:Property', 'rdfs:label': 'name' },
        { '@type': 'rdfs:Class', 'rdfs:label': 'Person' },
        { '@type': 'rdf:Property', 'rdfs:label': 'email' },
      ],
    }

    const result = filterGraph(jsonld, (node) => node['@type'] === 'rdf:Property')

    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('name')
    expect(result[1].label).toBe('email')
  })
})

describe('transform', () => {
  it('transforms entities with custom function', () => {
    const jsonld = {
      '@graph': [
        { '@type': 'Person', name: 'Alice' },
        { '@type': 'Person', name: 'Bob' },
      ],
    }

    const result = transform(jsonld, (node) => ({
      type: node.$type,
      displayName: `User: ${node.name}`,
    }))

    expect(result).toEqual([
      { type: 'Person', displayName: 'User: Alice' },
      { type: 'Person', displayName: 'User: Bob' },
    ])
  })
})

describe('extractLocalName', () => {
  it('extracts from full URIs', () => {
    expect(extractLocalName('https://schema.org/Person')).toBe('Person')
    expect(extractLocalName('http://www.w3.org/2000/01/rdf-schema#Class')).toBe('Class')
  })

  it('extracts from prefixed names', () => {
    expect(extractLocalName('schema:Person')).toBe('Person')
    expect(extractLocalName('rdfs:Class')).toBe('Class')
  })

  it('handles simple names', () => {
    expect(extractLocalName('Person')).toBe('Person')
  })

  it('handles empty strings', () => {
    expect(extractLocalName('')).toBe('')
  })
})

describe('extractRef', () => {
  it('extracts ID from reference object', () => {
    const ref = { '@id': 'https://schema.org/Thing' }
    expect(extractRef(ref)).toBe('Thing')
  })

  it('returns non-ref values unchanged', () => {
    expect(extractRef('string')).toBe('string')
    expect(extractRef(123)).toBe(123)
    expect(extractRef({ name: 'Alice' })).toEqual({ name: 'Alice' })
  })

  it('respects extractRefs option', () => {
    const ref = { '@id': 'https://schema.org/Thing' }
    expect(extractRef(ref, false)).toEqual(ref)
  })
})

describe('simplifyPropertyName', () => {
  it('simplifies common RDFS properties', () => {
    expect(simplifyPropertyName('rdfs:label')).toBe('label')
    expect(simplifyPropertyName('rdfs:comment')).toBe('description')
    expect(simplifyPropertyName('rdfs:subClassOf')).toBe('subClassOf')
  })

  it('simplifies schema.org properties', () => {
    expect(simplifyPropertyName('schema:domainIncludes')).toBe('domainIncludes')
    expect(simplifyPropertyName('schema:rangeIncludes')).toBe('rangeIncludes')
  })

  it('uses custom mappings', () => {
    expect(
      simplifyPropertyName('custom:field', { 'custom:field': 'myField' })
    ).toBe('myField')
  })

  it('returns original if no mapping', () => {
    expect(simplifyPropertyName('unknownProperty')).toBe('unknownProperty')
  })
})
