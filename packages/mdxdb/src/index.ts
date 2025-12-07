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
// Re-exported from @mdxdb/api for backward compatibility
export { ApiClient, createApiClient, createClient } from '@mdxdb/api'
export type { ApiClientConfig, ClientConfig } from '@mdxdb/api'

// DBClient adapter
export { createDBClient, MemoryDBClient } from './db-client.js'

// Export original Database interface types (local definitions)
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
  // View types (bi-directional relationship rendering/extraction)
  ViewEntityItem,
  ViewComponent,
  ViewDocument,
  ViewContext,
  ViewRenderResult,
  ViewRelationshipMutation,
  ViewSyncResult,
  ViewManager,
  DatabaseWithViews,
} from './types.js'

// Re-export ai-database compatible types (from ai-database, breaking circular dep)
export type {
  EntityId,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  DBClient,
  DBClientExtended,
  // Event, Action, Artifact types (simple event sourcing style)
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
} from 'ai-database'

// URL utilities (from ai-database)
export { resolveUrl, resolveShortUrl, parseUrl } from 'ai-database'

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
