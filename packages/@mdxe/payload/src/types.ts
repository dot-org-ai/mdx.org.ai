/**
 * Types for @mdxe/payload
 *
 * @packageDocumentation
 */

import type { CollectionConfig, GlobalConfig } from 'payload'

// =============================================================================
// Environment Types
// =============================================================================

/**
 * Environment bindings for Payload on Workers
 */
export interface PayloadWorkerEnv {
  /** Durable Object namespace for mdxdb SQLite */
  MDXDB?: DurableObjectNamespace

  /** ClickHouse URL (alternative to MDXDB) */
  CLICKHOUSE_URL?: string
  CLICKHOUSE_USERNAME?: string
  CLICKHOUSE_PASSWORD?: string
  CLICKHOUSE_DATABASE?: string

  /** Payload secret */
  PAYLOAD_SECRET: string

  /** Default namespace */
  NAMESPACE?: string

  /** Debug mode */
  DEBUG?: string
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for generating a Payload app
 */
export interface PayloadAppConfig {
  /**
   * Namespace for the app (e.g., 'example.com')
   */
  namespace: string

  /**
   * Database mode
   */
  database: 'sqlite' | 'clickhouse'

  /**
   * Include native mdxdb collections
   * @default true
   */
  nativeCollections?: boolean | {
    things?: boolean
    relationships?: boolean
    search?: boolean
    events?: boolean
    actions?: boolean
    artifacts?: boolean
  }

  /**
   * Custom collections to include
   */
  collections?: CollectionConfig[]

  /**
   * Global configs
   */
  globals?: GlobalConfig[]

  /**
   * Admin UI configuration
   */
  admin?: {
    /**
     * Admin route prefix
     * @default '/admin'
     */
    route?: string

    /**
     * Enable live preview
     */
    livePreview?: boolean

    /**
     * Custom branding
     */
    branding?: {
      logo?: string
      favicon?: string
      title?: string
    }
  }

  /**
   * API configuration
   */
  api?: {
    /**
     * API route prefix
     * @default '/api'
     */
    route?: string

    /**
     * Enable GraphQL
     */
    graphQL?: boolean

    /**
     * Enable REST API
     */
    rest?: boolean
  }

  /**
   * Authentication configuration
   */
  auth?: {
    /**
     * Enable user authentication
     */
    enabled?: boolean

    /**
     * User collection slug
     * @default 'users'
     */
    userSlug?: string

    /**
     * Enable API keys
     */
    apiKeys?: boolean
  }

  /**
   * Plugin configurations
   */
  plugins?: PayloadPluginConfig[]
}

/**
 * Plugin configuration
 */
export interface PayloadPluginConfig {
  name: string
  options?: Record<string, unknown>
}

// =============================================================================
// Generation Types
// =============================================================================

/**
 * Options for generating collections from MDX files
 */
export interface GenerateCollectionsOptions {
  /**
   * Source directory containing MDX files
   */
  source: string

  /**
   * Output directory for generated collections
   */
  output?: string

  /**
   * Collection configurations to generate
   */
  types?: TypeDefinition[]

  /**
   * Watch for changes
   */
  watch?: boolean
}

/**
 * Type definition from MDX frontmatter
 */
export interface TypeDefinition {
  /**
   * Type name (from $type in frontmatter)
   */
  name: string

  /**
   * Collection slug
   */
  slug: string

  /**
   * Fields extracted from frontmatter schema
   */
  fields: FieldDefinition[]

  /**
   * Relationships to other types
   */
  relationships?: RelationshipDefinition[]

  /**
   * JSON-LD context
   */
  context?: string | Record<string, unknown>
}

/**
 * Field definition
 */
export interface FieldDefinition {
  name: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'json' | 'richText' | 'upload' | 'relationship'
  required?: boolean
  unique?: boolean
  index?: boolean
  hasMany?: boolean
  options?: Array<{ label: string; value: string }>
  relationTo?: string | string[]
  admin?: {
    description?: string
    hidden?: boolean
    readOnly?: boolean
  }
}

/**
 * Relationship definition
 */
export interface RelationshipDefinition {
  name: string
  to: string
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany'
  reverse?: string
}

// =============================================================================
// Worker Types
// =============================================================================

/**
 * Payload Worker request handler
 */
export type PayloadHandler = (
  request: Request,
  env: PayloadWorkerEnv,
  ctx: ExecutionContext
) => Promise<Response>

/**
 * Payload Worker instance
 */
export interface PayloadWorker {
  fetch: PayloadHandler
}

// =============================================================================
// Cloudflare Types
// =============================================================================

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  idFromString(id: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
  newUniqueId(): DurableObjectId
}

export interface DurableObjectId {
  toString(): string
  name?: string
}

export interface DurableObjectStub {
  id: DurableObjectId
  name?: string
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
