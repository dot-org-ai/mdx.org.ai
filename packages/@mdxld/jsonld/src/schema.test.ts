import { describe, it, expect } from 'vitest'
import {
  toVocabulary,
  relationshipsFrom,
  relationshipsTo,
  typeHierarchy,
  allRelationshipsFor,
  // Legacy
  extractType,
  extractProperty,
  extractPropertiesForType,
  extractAllTypes,
  extractAllProperties,
} from './schema.js'
import { extractRefs } from './utils.js'

// Mock schema.org vocabulary (subset)
const mockVocab = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@id': 'https://schema.org/Thing',
      '@type': 'rdfs:Class',
      'rdfs:label': 'Thing',
      'rdfs:comment': 'The most generic type of item.',
    },
    {
      '@id': 'https://schema.org/Person',
      '@type': 'rdfs:Class',
      'rdfs:label': 'Person',
      'rdfs:comment': 'A person (alive, dead, undead, or fictional).',
      'rdfs:subClassOf': { '@id': 'https://schema.org/Thing' },
    },
    {
      '@id': 'https://schema.org/Organization',
      '@type': 'rdfs:Class',
      'rdfs:label': 'Organization',
      'rdfs:comment': 'An organization such as a school, NGO, corporation, club, etc.',
      'rdfs:subClassOf': { '@id': 'https://schema.org/Thing' },
    },
    {
      '@id': 'https://schema.org/name',
      '@type': 'rdf:Property',
      'rdfs:label': 'name',
      'rdfs:comment': 'The name of the item.',
      'schema:domainIncludes': { '@id': 'https://schema.org/Thing' },
      'schema:rangeIncludes': { '@id': 'https://schema.org/Text' },
    },
    {
      '@id': 'https://schema.org/email',
      '@type': 'rdf:Property',
      'rdfs:label': 'email',
      'rdfs:comment': 'Email address.',
      'schema:domainIncludes': [
        { '@id': 'https://schema.org/Person' },
        { '@id': 'https://schema.org/Organization' },
      ],
      'schema:rangeIncludes': { '@id': 'https://schema.org/Text' },
    },
    {
      '@id': 'https://schema.org/knows',
      '@type': 'rdf:Property',
      'rdfs:label': 'knows',
      'rdfs:comment': 'The most generic bi-directional social/work relation.',
      'schema:domainIncludes': { '@id': 'https://schema.org/Person' },
      'schema:rangeIncludes': { '@id': 'https://schema.org/Person' },
      'schema:inverseOf': { '@id': 'https://schema.org/knows' },
    },
    {
      '@id': 'https://schema.org/givenName',
      '@type': 'rdf:Property',
      'rdfs:label': 'givenName',
      'rdfs:comment': 'Given name. In the U.S., the first name of a Person.',
      'schema:domainIncludes': { '@id': 'https://schema.org/Person' },
      'schema:rangeIncludes': { '@id': 'https://schema.org/Text' },
      'rdfs:subPropertyOf': { '@id': 'https://schema.org/name' },
    },
  ],
}

describe('toVocabulary', () => {
  it('converts vocabulary to Things + Relationships', () => {
    const vocab = toVocabulary(mockVocab)

    expect(vocab.$context).toBe('https://schema.org')
    expect(vocab.things.size).toBe(3) // Thing, Person, Organization
    expect(vocab.relationships.size).toBe(4) // name, email, knows, givenName
  })

  it('extracts Things with correct structure', () => {
    const vocab = toVocabulary(mockVocab)
    const person = vocab.things.get('Person')

    expect(person).toEqual({
      $type: 'Class',
      $id: 'https://schema.org/Person',
      name: 'Person',
      description: 'A person (alive, dead, undead, or fictional).',
      subClassOf: ['Thing'],
    })
  })

  it('extracts Relationships with correct structure', () => {
    const vocab = toVocabulary(mockVocab)
    const email = vocab.relationships.get('email')

    expect(email).toEqual({
      $type: 'Property',
      $id: 'https://schema.org/email',
      name: 'email',
      description: 'Email address.',
      from: ['Person', 'Organization'],
      to: ['Text'],
      subPropertyOf: undefined,
      inverseOf: undefined,
      supersededBy: undefined,
    })
  })

  it('extracts relationship with inverseOf', () => {
    const vocab = toVocabulary(mockVocab)
    const knows = vocab.relationships.get('knows')

    expect(knows?.inverseOf).toBe('knows')
  })

  it('extracts relationship with subPropertyOf', () => {
    const vocab = toVocabulary(mockVocab)
    const givenName = vocab.relationships.get('givenName')

    expect(givenName?.subPropertyOf).toBe('name')
  })
})

describe('relationshipsFrom', () => {
  it('gets relationships that can originate from a type', () => {
    const vocab = toVocabulary(mockVocab)
    const rels = relationshipsFrom(vocab, 'Person')

    expect(rels.map(r => r.name)).toContain('email')
    expect(rels.map(r => r.name)).toContain('knows')
    expect(rels.map(r => r.name)).toContain('givenName')
  })

  it('gets relationships from Thing (inherited by all)', () => {
    const vocab = toVocabulary(mockVocab)
    const rels = relationshipsFrom(vocab, 'Thing')

    expect(rels).toHaveLength(1)
    expect(rels[0].name).toBe('name')
  })
})

describe('relationshipsTo', () => {
  it('gets relationships that can target a type', () => {
    const vocab = toVocabulary(mockVocab)
    const rels = relationshipsTo(vocab, 'Person')

    expect(rels.map(r => r.name)).toContain('knows')
  })

  it('gets relationships targeting Text', () => {
    const vocab = toVocabulary(mockVocab)
    const rels = relationshipsTo(vocab, 'Text')

    expect(rels.map(r => r.name)).toContain('name')
    expect(rels.map(r => r.name)).toContain('email')
  })
})

describe('typeHierarchy', () => {
  it('gets parent types', () => {
    const vocab = toVocabulary(mockVocab)
    const hierarchy = typeHierarchy(vocab, 'Person')

    expect(hierarchy).toEqual(['Thing'])
  })

  it('returns empty for root type', () => {
    const vocab = toVocabulary(mockVocab)
    const hierarchy = typeHierarchy(vocab, 'Thing')

    expect(hierarchy).toEqual([])
  })
})

describe('allRelationshipsFor', () => {
  it('gets relationships including inherited', () => {
    const vocab = toVocabulary(mockVocab)
    const rels = allRelationshipsFor(vocab, 'Person')

    // Person has: email, knows, givenName
    // Inherits from Thing: name
    expect(rels.map(r => r.name)).toContain('email')
    expect(rels.map(r => r.name)).toContain('knows')
    expect(rels.map(r => r.name)).toContain('givenName')
    expect(rels.map(r => r.name)).toContain('name')
  })
})

// Legacy tests (deprecated functions)
describe('extractType', () => {
  it('extracts a type definition', () => {
    const result = extractType(mockVocab, 'Person', { includeProperties: false })

    expect(result).toEqual({
      $type: 'Class',
      $id: 'https://schema.org/Person',
      label: 'Person',
      description: 'A person (alive, dead, undead, or fictional).',
      subClassOf: 'Thing',
    })
  })

  it('extracts type with properties', () => {
    const result = extractType(mockVocab, 'Person')

    expect(result?.label).toBe('Person')
    expect(result?.properties).toHaveLength(3) // email, knows, givenName
    expect(result?.properties?.map(p => p.name)).toContain('email')
    expect(result?.properties?.map(p => p.name)).toContain('knows')
    expect(result?.properties?.map(p => p.name)).toContain('givenName')
  })

  it('returns undefined for non-existent type', () => {
    const result = extractType(mockVocab, 'NonExistent')
    expect(result).toBeUndefined()
  })

  it('handles root type without subClassOf', () => {
    const result = extractType(mockVocab, 'Thing', { includeProperties: false })

    expect(result).toEqual({
      $type: 'Class',
      $id: 'https://schema.org/Thing',
      label: 'Thing',
      description: 'The most generic type of item.',
      subClassOf: undefined,
    })
  })
})

describe('extractProperty', () => {
  it('extracts a property definition', () => {
    const result = extractProperty(mockVocab, 'name')

    expect(result).toEqual({
      $type: 'Property',
      $id: 'https://schema.org/name',
      name: 'name',
      description: 'The name of the item.',
      domainIncludes: ['Thing'],
      rangeIncludes: ['Text'],
      subPropertyOf: undefined,
      inverseOf: undefined,
      supersededBy: undefined,
    })
  })

  it('extracts property with multiple domains', () => {
    const result = extractProperty(mockVocab, 'email')

    expect(result?.domainIncludes).toEqual(['Person', 'Organization'])
  })

  it('extracts property with inverseOf', () => {
    const result = extractProperty(mockVocab, 'knows')

    expect(result?.inverseOf).toBe('knows')
  })

  it('extracts property with subPropertyOf', () => {
    const result = extractProperty(mockVocab, 'givenName')

    expect(result?.subPropertyOf).toBe('name')
  })

  it('returns undefined for non-existent property', () => {
    const result = extractProperty(mockVocab, 'nonExistent')
    expect(result).toBeUndefined()
  })
})

describe('extractPropertiesForType', () => {
  it('extracts properties for a type', () => {
    const result = extractPropertiesForType(mockVocab, 'Person')

    expect(result).toHaveLength(3)
    expect(result.map(p => p.name)).toContain('email')
    expect(result.map(p => p.name)).toContain('knows')
    expect(result.map(p => p.name)).toContain('givenName')
  })

  it('extracts properties for Thing (inherited by all)', () => {
    const result = extractPropertiesForType(mockVocab, 'Thing')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('name')
  })

  it('returns empty array for type with no properties', () => {
    const vocabWithNoProps = {
      '@graph': [
        { '@id': 'https://schema.org/Empty', '@type': 'rdfs:Class' },
      ],
    }
    const result = extractPropertiesForType(vocabWithNoProps, 'Empty')
    expect(result).toEqual([])
  })
})

describe('extractAllTypes', () => {
  it('extracts all types from vocabulary', () => {
    const result = extractAllTypes(mockVocab)

    expect(result).toHaveLength(3)
    expect(result.map(t => t.label)).toContain('Thing')
    expect(result.map(t => t.label)).toContain('Person')
    expect(result.map(t => t.label)).toContain('Organization')
  })
})

describe('extractAllProperties', () => {
  it('extracts all properties from vocabulary', () => {
    const result = extractAllProperties(mockVocab)

    expect(result).toHaveLength(4)
    expect(result.map(p => p.name)).toContain('name')
    expect(result.map(p => p.name)).toContain('email')
    expect(result.map(p => p.name)).toContain('knows')
    expect(result.map(p => p.name)).toContain('givenName')
  })
})

describe('extractRefs', () => {
  it('extracts single ref', () => {
    const result = extractRefs({ '@id': 'https://schema.org/Thing' })
    expect(result).toEqual(['Thing'])
  })

  it('extracts array of refs', () => {
    const result = extractRefs([
      { '@id': 'https://schema.org/Person' },
      { '@id': 'https://schema.org/Organization' },
    ])
    expect(result).toEqual(['Person', 'Organization'])
  })

  it('handles null/undefined', () => {
    expect(extractRefs(null)).toEqual([])
    expect(extractRefs(undefined)).toEqual([])
  })

  it('handles string values', () => {
    const result = extractRefs('https://schema.org/Text')
    expect(result).toEqual(['Text'])
  })
})
