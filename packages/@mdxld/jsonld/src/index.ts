/**
 * @mdxld/jsonld - Convert between JSON-LD and MDXLD formats
 *
 * @example
 * ```ts
 * import { fromJsonLD, toJsonLD, extractGraph, findByType } from '@mdxld/jsonld'
 *
 * // Convert JSON-LD to MDXLD (@ → $)
 * const mdxld = fromJsonLD({
 *   "@context": "https://schema.org",
 *   "@type": "Person",
 *   "name": "Alice"
 * })
 * // { $context: "https://schema.org", $type: "Person", name: "Alice" }
 *
 * // Convert MDXLD to JSON-LD ($ → @)
 * const jsonld = toJsonLD({
 *   $context: "https://schema.org",
 *   $type: "Person",
 *   name: "Alice"
 * })
 * // { "@context": "https://schema.org", "@type": "Person", "name": "Alice" }
 *
 * // Extract entities from @graph
 * const entities = extractGraph(schemaOrgResponse)
 *
 * // Find entity by type
 * const person = findByType(schemaOrgResponse, 'Person')
 * ```
 */

export {
  fromJsonLD,
  toJsonLD,
  extractGraph,
  findByType,
  findById,
  filterGraph,
  transform,
} from './convert.js'

export {
  extractLocalName,
  extractRef,
  extractRefs,
  simplifyPropertyName,
  stripBaseUrl,
  ensureArray,
  removeEmptyValues,
} from './utils.js'

// Vocabulary conversion (Things + Relationships)
export {
  toVocabulary,
  relationshipsFrom,
  relationshipsTo,
  typeHierarchy,
  typeDescendants,
  typesForProperty,
  propertiesForType,
  allRelationshipsFor,
  // Extended vocabulary (superset support)
  extendVocabulary,
  filterBySource,
  type Thing,
  type RelationshipDef,
  type Vocabulary,
  type VocabularySource,
  type ExtendedVocabulary,
  type ExtendVocabularyOptions,
  // Legacy exports (deprecated)
  extractType,
  extractProperty,
  extractPropertiesForType,
  extractAllTypes,
  extractAllProperties,
  type SchemaType,
  type SchemaProperty,
} from './schema.js'

export {
  JSON_LD_KEYWORDS,
  MDXLD_KEYWORDS,
  RDF_PREFIXES,
  PROPERTY_SIMPLIFICATIONS,
  type JsonLDDocument,
  type JsonLDNode,
  type MDXLDDocument,
  type MDXLDNode,
  type ConversionOptions,
} from './types.js'
