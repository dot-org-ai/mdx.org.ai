/**
 * Native mdxdb collections for Payload CMS
 *
 * Exposes mdxdb's core entities as Payload collections:
 * - Things: Graph nodes (documents)
 * - Relationships: Graph edges
 * - Search: Indexed content with embeddings
 * - Events: Immutable event log
 * - Actions: Jobs/Tasks/Workflows queue
 *
 * @packageDocumentation
 */

import type { CollectionConfig, Field } from 'payload'

// =============================================================================
// Things Collection
// =============================================================================

/**
 * Things collection - exposes all mdxdb Things as a single collection
 * Type-specific collections are created dynamically as virtual collections
 */
export const ThingsCollection: CollectionConfig = {
  slug: 'things',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['url', 'ns', 'type', 'id', 'updatedAt'],
    group: 'MDXDB',
    description: 'Graph nodes - the core entity type in mdxdb',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique URL identifier (https://ns/type/id)',
        readOnly: true,
      },
    },
    {
      name: 'ns',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Namespace (e.g., example.com)',
      },
    },
    {
      name: 'type',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Type name (e.g., Post, Author)',
      },
    },
    {
      name: 'branch',
      type: 'text',
      defaultValue: 'main',
      admin: {
        description: 'Git-style branch for versioning',
      },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'Version number within branch',
        readOnly: true,
      },
    },
    {
      name: 'data',
      type: 'json',
      required: true,
      admin: {
        description: 'Document data (frontmatter)',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      admin: {
        description: 'Markdown/MDX content',
      },
    },
    {
      name: 'context',
      type: 'json',
      admin: {
        description: 'JSON-LD @context',
      },
    },
    {
      name: 'meta',
      type: 'json',
      admin: {
        description: 'Additional metadata',
      },
    },
  ],
  timestamps: true,
  versions: {
    drafts: {
      autosave: {
        interval: 2000,
      },
    },
    maxPerDoc: 100,
  },
}

// =============================================================================
// Relationships Collection
// =============================================================================

/**
 * Relationships collection - graph edges between Things
 */
export const RelationshipsCollection: CollectionConfig = {
  slug: 'relationships',
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['type', 'from', 'to', 'createdAt'],
    group: 'MDXDB',
    description: 'Graph edges connecting Things',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'type',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Relationship predicate (e.g., author, tags)',
      },
    },
    {
      name: 'from',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Source Thing URL',
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Target Thing URL',
      },
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        description: 'Relationship metadata',
      },
    },
    {
      name: 'reverse',
      type: 'text',
      admin: {
        description: 'Reverse predicate name (for bi-directional)',
      },
    },
  ],
  timestamps: true,
}

// =============================================================================
// Search Collection
// =============================================================================

/**
 * Search collection - indexed content with embeddings for semantic search
 */
export const SearchCollection: CollectionConfig = {
  slug: 'search',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'ns', 'createdAt'],
    group: 'MDXDB',
    description: 'Indexed content with vector embeddings',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Source Thing URL',
      },
    },
    {
      name: 'ns',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Content title',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Content description',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Indexed text content',
      },
    },
    {
      name: 'keywords',
      type: 'json',
      admin: {
        description: 'Keywords array for search',
      },
    },
    {
      name: 'embedding',
      type: 'json',
      admin: {
        description: 'Vector embedding array',
        readOnly: true,
      },
    },
    {
      name: 'model',
      type: 'text',
      admin: {
        description: 'Embedding model used',
      },
    },
    {
      name: 'language',
      type: 'text',
      defaultValue: 'en',
    },
    {
      name: 'locale',
      type: 'text',
      defaultValue: 'en-US',
    },
  ],
  timestamps: true,
}

// =============================================================================
// Events Collection
// =============================================================================

/**
 * Events collection - immutable event log (Actor-Event-Object-Result pattern)
 */
export const EventsCollection: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'event',
    defaultColumns: ['event', 'actor', 'object', 'createdAt'],
    group: 'MDXDB',
    description: 'Immutable event log for audit/analytics',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false, // Events are immutable
    delete: () => false,
  },
  fields: [
    {
      name: 'ns',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'event',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Event type (e.g., User.created, Post.published)',
      },
    },
    {
      name: 'actor',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Actor URL (who triggered the event)',
      },
    },
    {
      name: 'actorData',
      type: 'json',
      admin: {
        description: 'Snapshot of actor data at event time',
      },
    },
    {
      name: 'object',
      type: 'text',
      index: true,
      admin: {
        description: 'Object URL (what was acted upon)',
      },
    },
    {
      name: 'objectData',
      type: 'json',
      admin: {
        description: 'Event payload data',
      },
    },
    {
      name: 'result',
      type: 'text',
      admin: {
        description: 'Result URL (what was produced)',
      },
    },
    {
      name: 'resultData',
      type: 'json',
      admin: {
        description: 'Result data',
      },
    },
    {
      name: 'correlationId',
      type: 'text',
      index: true,
      admin: {
        description: 'ID linking related events',
      },
    },
    {
      name: 'causationId',
      type: 'text',
      index: true,
      admin: {
        description: 'ID of the event that caused this',
      },
    },
  ],
  timestamps: true,
}

// =============================================================================
// Actions Collection (Jobs Queue / Tasks / Workflows)
// =============================================================================

/**
 * Actions collection - Jobs queue with workflow support
 * Maps Payload Jobs/Tasks to mdxdb Actions
 */
export const ActionsCollection: CollectionConfig = {
  slug: 'actions',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'status', 'actor', 'object', 'updatedAt'],
    group: 'MDXDB',
    description: 'Jobs queue - Tasks, Workflows, Background Jobs',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    // Identity
    {
      name: 'ns',
      type: 'text',
      required: true,
      index: true,
    },
    // Linguistic verb conjugations (act → action → activity)
    {
      name: 'act',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Base verb (e.g., publish, process, send)',
      },
    },
    {
      name: 'action',
      type: 'text',
      required: true,
      admin: {
        description: 'Third person (e.g., publishes, processes, sends)',
      },
    },
    {
      name: 'activity',
      type: 'text',
      required: true,
      admin: {
        description: 'Present participle (e.g., publishing, processing, sending)',
      },
    },
    // Actor
    {
      name: 'actor',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Actor URL (who/what initiated the action)',
      },
    },
    {
      name: 'actorData',
      type: 'json',
    },
    // Target object
    {
      name: 'object',
      type: 'text',
      index: true,
      admin: {
        description: 'Object URL (what is being acted upon)',
      },
    },
    {
      name: 'objectData',
      type: 'json',
    },
    // Staged objects (for batch operations like publish)
    {
      name: 'objects',
      type: 'json',
      admin: {
        description: 'Array of staged objects for batch operations',
      },
    },
    {
      name: 'objectsCount',
      type: 'number',
      defaultValue: 0,
    },
    // Git integration (for deploy/publish actions)
    {
      name: 'repo',
      type: 'text',
      admin: {
        description: 'Git repository URL',
      },
    },
    {
      name: 'branch',
      type: 'text',
      defaultValue: 'main',
    },
    {
      name: 'commit',
      type: 'text',
      admin: {
        description: 'Git commit hash',
      },
    },
    {
      name: 'commitMessage',
      type: 'textarea',
    },
    {
      name: 'commitAuthor',
      type: 'text',
    },
    {
      name: 'commitEmail',
      type: 'email',
    },
    {
      name: 'commitTs',
      type: 'date',
    },
    {
      name: 'diff',
      type: 'textarea',
      admin: {
        description: 'Git diff for the action',
      },
    },
    // Workflow state
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Retrying', value: 'retrying' },
      ],
    },
    {
      name: 'progress',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Progress (0-100 or current step)',
      },
    },
    {
      name: 'total',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total steps/items',
      },
    },
    {
      name: 'result',
      type: 'json',
      admin: {
        description: 'Action result data',
      },
    },
    {
      name: 'error',
      type: 'textarea',
      admin: {
        description: 'Error message if failed',
      },
    },
    // Action data
    {
      name: 'data',
      type: 'json',
      admin: {
        description: 'Action metadata/payload',
      },
    },
    {
      name: 'meta',
      type: 'json',
    },
    // Execution control
    {
      name: 'priority',
      type: 'number',
      defaultValue: 5,
      admin: {
        description: 'Priority (1=highest, 10=lowest)',
      },
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'maxAttempts',
      type: 'number',
      defaultValue: 3,
    },
    {
      name: 'timeout',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Timeout in milliseconds (0=no timeout)',
      },
    },
    {
      name: 'ttl',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Time-to-live in milliseconds (0=no expiry)',
      },
    },
    // Batch processing
    {
      name: 'batch',
      type: 'text',
      admin: {
        description: 'Batch ID for grouped actions',
      },
    },
    {
      name: 'batchIndex',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'batchTotal',
      type: 'number',
      defaultValue: 0,
    },
    // Hierarchy (for workflows)
    {
      name: 'parent',
      type: 'text',
      admin: {
        description: 'Parent action ID (for workflows)',
      },
    },
    {
      name: 'children',
      type: 'json',
      admin: {
        description: 'Child action IDs',
      },
    },
    {
      name: 'dependencies',
      type: 'json',
      admin: {
        description: 'Actions that must complete first',
      },
    },
    // Timestamps
    {
      name: 'scheduledAt',
      type: 'date',
      admin: {
        description: 'When to execute (for scheduled jobs)',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'completedAt',
      type: 'date',
    },
  ],
  timestamps: true,
}

// =============================================================================
// Artifacts Collection
// =============================================================================

/**
 * Artifacts collection - cached compiled content
 */
export const ArtifactsCollection: CollectionConfig = {
  slug: 'artifacts',
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['type', 'source', 'status', 'createdAt'],
    group: 'MDXDB',
    description: 'Cached compiled content and build artifacts',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'ns',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Compiled MDX', value: 'compiled' },
        { label: 'AST', value: 'ast' },
        { label: 'Metadata', value: 'metadata' },
        { label: 'Embeddings', value: 'embeddings' },
        { label: 'Thumbnail', value: 'thumbnail' },
        { label: 'Preview', value: 'preview' },
        { label: 'Export', value: 'export' },
      ],
    },
    {
      name: 'source',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Source Thing URL',
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'path',
      type: 'text',
      admin: {
        description: 'Storage path',
      },
    },
    {
      name: 'storage',
      type: 'text',
      admin: {
        description: 'Storage backend (r2, fs, etc)',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      admin: {
        description: 'Artifact content (if inline)',
      },
    },
    {
      name: 'code',
      type: 'code',
      admin: {
        language: 'javascript',
        description: 'Compiled code (if applicable)',
      },
    },
    {
      name: 'data',
      type: 'json',
    },
    {
      name: 'meta',
      type: 'json',
    },
    {
      name: 'contentType',
      type: 'text',
    },
    {
      name: 'encoding',
      type: 'text',
      defaultValue: 'utf-8',
    },
    {
      name: 'size',
      type: 'number',
    },
    {
      name: 'hash',
      type: 'text',
      admin: {
        description: 'Source hash for cache invalidation',
      },
    },
    {
      name: 'build',
      type: 'text',
      admin: {
        description: 'Build ID',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Building', value: 'building' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'log',
      type: 'textarea',
      admin: {
        description: 'Build log',
      },
    },
    {
      name: 'expires',
      type: 'date',
    },
  ],
  timestamps: true,
}

// =============================================================================
// Collection Generator
// =============================================================================

/**
 * Options for generating native mdxdb collections
 */
export interface NativeCollectionsOptions {
  /**
   * Include Things collection
   * @default true
   */
  things?: boolean

  /**
   * Include Relationships collection
   * @default true
   */
  relationships?: boolean

  /**
   * Include Search collection
   * @default true
   */
  search?: boolean

  /**
   * Include Events collection
   * @default true
   */
  events?: boolean

  /**
   * Include Actions collection (Jobs/Tasks/Workflows)
   * @default true
   */
  actions?: boolean

  /**
   * Include Artifacts collection
   * @default true
   */
  artifacts?: boolean

  /**
   * Custom access control for all collections
   */
  access?: {
    read?: () => boolean
    create?: () => boolean
    update?: () => boolean
    delete?: () => boolean
  }
}

/**
 * Generate native mdxdb collections for Payload
 */
export function getNativeCollections(options: NativeCollectionsOptions = {}): CollectionConfig[] {
  const {
    things = true,
    relationships = true,
    search = true,
    events = true,
    actions = true,
    artifacts = true,
    access,
  } = options

  const collections: CollectionConfig[] = []

  if (things) {
    const collection = { ...ThingsCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  if (relationships) {
    const collection = { ...RelationshipsCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  if (search) {
    const collection = { ...SearchCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  if (events) {
    const collection = { ...EventsCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  if (actions) {
    const collection = { ...ActionsCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  if (artifacts) {
    const collection = { ...ArtifactsCollection }
    if (access) collection.access = { ...collection.access, ...access }
    collections.push(collection)
  }

  return collections
}

// =============================================================================
// Virtual Collection Generator
// =============================================================================

/**
 * Generate a virtual collection for a specific Thing type
 * This creates a Payload collection that maps to Things of a specific type
 */
export function createVirtualCollection(options: {
  /**
   * Collection slug (e.g., 'posts')
   */
  slug: string

  /**
   * mdxdb type name (e.g., 'Post')
   */
  type: string

  /**
   * Collection labels
   */
  labels?: {
    singular?: string
    plural?: string
  }

  /**
   * Additional fields beyond the default Thing fields
   */
  fields?: Field[]

  /**
   * Admin group
   */
  group?: string

  /**
   * Enable versioning
   */
  versions?: boolean

  /**
   * Custom access control
   */
  access?: {
    read?: () => boolean
    create?: () => boolean
    update?: () => boolean
    delete?: () => boolean
  }
}): CollectionConfig {
  const {
    slug,
    type,
    labels,
    fields = [],
    group = 'Content',
    versions = true,
    access,
  } = options

  return {
    slug,
    labels: labels ?? {
      singular: type,
      plural: `${type}s`,
    },
    admin: {
      useAsTitle: 'title',
      group,
      description: `${type} documents stored as mdxdb Things`,
    },
    access: access ?? {
      read: () => true,
      create: () => true,
      update: () => true,
      delete: () => true,
    },
    fields: [
      // Common content fields
      {
        name: 'title',
        type: 'text',
        required: true,
      },
      {
        name: 'slug',
        type: 'text',
        unique: true,
        admin: {
          description: 'URL-safe identifier',
        },
      },
      {
        name: 'content',
        type: 'richText',
        admin: {
          description: 'Main content (stored as MDX)',
        },
      },
      {
        name: 'excerpt',
        type: 'textarea',
      },
      // JSON-LD context
      {
        name: 'context',
        type: 'json',
        admin: {
          description: 'JSON-LD @context',
        },
      },
      // Additional fields
      ...fields,
      // Hidden mdxdb fields
      {
        name: '_url',
        type: 'text',
        admin: {
          hidden: true,
          readOnly: true,
        },
      },
      {
        name: '_type',
        type: 'text',
        defaultValue: type,
        admin: {
          hidden: true,
          readOnly: true,
        },
      },
      {
        name: '_branch',
        type: 'text',
        defaultValue: 'main',
        admin: {
          hidden: true,
        },
      },
    ],
    timestamps: true,
    versions: versions
      ? {
          drafts: {
            autosave: {
              interval: 2000,
            },
          },
          maxPerDoc: 100,
        }
      : false,
  }
}
