/**
 * MDXDB - Create, Manage, & Publish MDX & URL-centric File System & Database
 *
 * Provides two interfaces:
 * 1. Database - Simple document-based interface (original)
 * 2. DBClient - Graph database interface following ai-database conventions
 *
 * @packageDocumentation
 */

export const name = 'mdxdb'

// API Client for connecting to remote mdxdb servers
export { ApiClient, createApiClient } from './client.js'
export type { ApiClientConfig } from './client.js'

// DBClient adapter
export { createDBClient, MemoryDBClient } from './db-client.js'

// Export all types
export type {
  // Original Database interface
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
  Database,
  DatabaseConfig,
  CreateDatabase,
  // ai-database compatible types
  EntityId,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  DBClient,
  // Event, Action, Artifact types (ai-workflows integration)
  Event,
  Action,
  ActionStatus,
  Artifact,
  ArtifactType,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  DBClientExtended,
} from './types.js'

// URL utilities
export { resolveUrl, resolveShortUrl, parseUrl } from './types.js'

// Re-export mdxld types for convenience
export type { MDXLDDocument, MDXLDData, LDProperties } from 'mdxld'

// Re-export ai-database types and functions
export {
  // Core DB factory
  DB,
  // Schema utilities
  parseSchema,
  setProvider,
  setNLQueryGenerator,
  // Memory provider
  MemoryProvider,
  createMemoryProvider,
  Semaphore,
  // Thing conversion utilities
  toExpanded,
  toFlat,
  // Noun & Verb definition
  defineNoun,
  defineVerb,
  nounToSchema,
  Verbs,
  // AI linguistic inference
  conjugate,
  pluralize,
  singularize,
  inferNoun,
  Type,
} from 'ai-database'
export type {
  // Schema types
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,
  PrimitiveType,
  ParsedSchema,
  ParsedEntity,
  ParsedField,
  // DB types
  TypedDB,
  EntityOperations,
  DBProvider,
  DBResult,
  ListOptions as DBListOptions,
  SearchOptions as DBSearchOptions,
  GenerateOptions,
  InferEntity,
  // Thing types (mdxld-based)
  ThingFlat,
  ThingExpanded,
  // Noun & Verb semantic types
  Noun,
  NounProperty,
  NounRelationship,
  Verb,
  TypeMeta,
  // API types
  EventsAPI,
  ActionsAPI,
  ArtifactsAPI,
  NounsAPI,
  VerbsAPI,
  DBEvent,
  DBAction,
  DBArtifact,
  // Natural Language Query types
  NLQueryResult,
  NLQueryFn,
  NLQueryGenerator,
  NLQueryContext,
  NLQueryPlan,
  // Memory provider types
  Event as MemoryEvent,
  Action as MemoryAction,
  Artifact as MemoryArtifact,
  MemoryProviderOptions,
} from 'ai-database'
