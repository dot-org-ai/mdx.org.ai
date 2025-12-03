/**
 * JSON-LD keyword mappings
 */
export const JSON_LD_KEYWORDS = {
  '@id': '$id',
  '@type': '$type',
  '@context': '$context',
  '@graph': '$graph',
  '@value': '$value',
  '@language': '$language',
  '@list': '$list',
  '@set': '$set',
  '@reverse': '$reverse',
  '@index': '$index',
  '@base': '$base',
  '@vocab': '$vocab',
  '@container': '$container',
  '@nest': '$nest',
  '@prefix': '$prefix',
  '@propagate': '$propagate',
  '@protected': '$protected',
  '@version': '$version',
  '@direction': '$direction',
  '@import': '$import',
  '@included': '$included',
  '@json': '$json',
  '@none': '$none',
} as const

/**
 * MDXLD keyword mappings (reverse of JSON-LD)
 */
export const MDXLD_KEYWORDS = Object.fromEntries(
  Object.entries(JSON_LD_KEYWORDS).map(([k, v]) => [v, k])
) as { [K in (typeof JSON_LD_KEYWORDS)[keyof typeof JSON_LD_KEYWORDS]]: keyof typeof JSON_LD_KEYWORDS }

/**
 * Common RDF namespace prefixes
 */
export const RDF_PREFIXES = {
  'rdf:': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#',
  'schema:': 'https://schema.org/',
  'xsd:': 'http://www.w3.org/2001/XMLSchema#',
  'owl:': 'http://www.w3.org/2002/07/owl#',
  'dc:': 'http://purl.org/dc/elements/1.1/',
  'dcterms:': 'http://purl.org/dc/terms/',
  'foaf:': 'http://xmlns.com/foaf/0.1/',
  'skos:': 'http://www.w3.org/2004/02/skos/core#',
} as const

/**
 * Common property simplifications
 */
export const PROPERTY_SIMPLIFICATIONS: Record<string, string> = {
  // RDFS
  'rdfs:label': 'label',
  'rdfs:comment': 'description',
  'rdfs:subClassOf': 'subClassOf',
  'rdfs:subPropertyOf': 'subPropertyOf',
  'rdfs:domain': 'domain',
  'rdfs:range': 'range',
  'rdfs:seeAlso': 'seeAlso',
  'rdfs:isDefinedBy': 'isDefinedBy',
  // Schema.org
  'schema:domainIncludes': 'domainIncludes',
  'schema:rangeIncludes': 'rangeIncludes',
  'schema:inverseOf': 'inverseOf',
  'schema:supersededBy': 'supersededBy',
  'schema:category': 'category',
  'schema:isPartOf': 'isPartOf',
  'schema:source': 'source',
  // RDF
  'rdf:type': 'type',
  'rdf:Property': 'Property',
  'rdf:Class': 'Class',
}

/**
 * JSON-LD document structure
 */
export interface JsonLDDocument {
  '@context'?: string | string[] | Record<string, unknown>
  '@graph'?: JsonLDNode[]
  '@id'?: string
  '@type'?: string | string[]
  [key: string]: unknown
}

/**
 * JSON-LD node
 */
export interface JsonLDNode {
  '@id'?: string
  '@type'?: string | string[]
  '@value'?: unknown
  '@language'?: string
  '@list'?: unknown[]
  '@set'?: unknown[]
  [key: string]: unknown
}

/**
 * MDXLD document structure
 */
export interface MDXLDDocument {
  $context?: string | string[] | Record<string, unknown>
  $graph?: MDXLDNode[]
  $id?: string
  $type?: string | string[]
  [key: string]: unknown
}

/**
 * MDXLD node
 */
export interface MDXLDNode {
  $id?: string
  $type?: string | string[]
  $value?: unknown
  $language?: string
  $list?: unknown[]
  $set?: unknown[]
  [key: string]: unknown
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /**
   * Simplify RDF property names (e.g., 'rdfs:label' → 'label')
   * @default true
   */
  simplifyProperties?: boolean

  /**
   * Extract IDs from reference objects (e.g., { '@id': 'http://...' } → 'TypeName')
   * @default true
   */
  extractRefs?: boolean

  /**
   * Base URL to strip from IDs
   */
  baseUrl?: string

  /**
   * Flatten @graph into array of entities
   * @default false
   */
  flattenGraph?: boolean

  /**
   * Remove null and undefined values
   * @default true
   */
  removeEmpty?: boolean

  /**
   * Custom property mappings
   */
  propertyMappings?: Record<string, string>
}
