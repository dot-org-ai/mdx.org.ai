/**
 * JSON:API Serializers using ts-japi
 *
 * Serializers for converting ai-database domain objects to JSON:API format
 *
 * @packageDocumentation
 */

import { Serializer, Linker, Metaizer, ErrorSerializer } from 'ts-japi'
import type { Thing, Relationship, Event, Action, Artifact } from 'ai-database'

/**
 * Serializer for Thing resources
 */
export const ThingSerializer = new Serializer<Thing>('things', {
  projection: {
    id: 1,
    type: 1,
    url: 1,
    ns: 1,
    data: 1,
  },
  linkers: {
    resource: new Linker((thing) => thing.url || ''),
  },
  metaizers: {
    resource: new Metaizer((thing) => ({
      createdAt: thing.createdAt?.toISOString(),
      updatedAt: thing.updatedAt?.toISOString(),
    })),
  },
})

/**
 * Serializer for Relationship resources
 */
export const RelationshipSerializer = new Serializer<Relationship>('relationships', {
  projection: {
    id: 1,
    type: 1,
    from: 1,
    to: 1,
    data: 1,
  },
  metaizers: {
    resource: new Metaizer((rel) => ({
      createdAt: rel.createdAt?.toISOString(),
    })),
  },
})

/**
 * Serializer for Event resources
 */
export const EventSerializer = new Serializer<Event>('events', {
  projection: {
    id: 1,
    type: 1,
    source: 1,
    data: 1,
    correlationId: 1,
    causationId: 1,
  },
  metaizers: {
    resource: new Metaizer((event) => ({
      timestamp: event.timestamp?.toISOString(),
    })),
  },
})

/**
 * Serializer for Action resources
 */
export const ActionSerializer = new Serializer<Action>('actions', {
  projection: {
    id: 1,
    actor: 1,
    object: 1,
    action: 1,
    status: 1,
    result: 1,
    error: 1,
    metadata: 1,
  },
  metaizers: {
    resource: new Metaizer((action) => ({
      createdAt: action.createdAt?.toISOString(),
      updatedAt: action.updatedAt?.toISOString(),
      startedAt: action.startedAt?.toISOString(),
      completedAt: action.completedAt?.toISOString(),
    })),
  },
})

/**
 * Serializer for Artifact resources
 */
export const ArtifactSerializer = new Serializer<Artifact>('artifacts', {
  projection: {
    key: 1,
    type: 1,
    source: 1,
    sourceHash: 1,
    content: 1,
    size: 1,
    metadata: 1,
  },
  metaizers: {
    resource: new Metaizer((artifact) => ({
      createdAt: artifact.createdAt?.toISOString(),
      expiresAt: artifact.expiresAt?.toISOString(),
    })),
  },
})

/**
 * Error serializer for API errors
 */
export const apiErrorSerializer = new ErrorSerializer()

/**
 * Serialize a single resource or array of resources
 */
export async function serializeThings<T extends Record<string, unknown>>(
  data: Thing<T> | Thing<T>[] | null
): Promise<unknown> {
  if (data === null) return { data: null }
  return ThingSerializer.serialize(data as Thing | Thing[])
}

export async function serializeRelationships<T extends Record<string, unknown>>(
  data: Relationship<T> | Relationship<T>[] | null
): Promise<unknown> {
  if (data === null) return { data: null }
  return RelationshipSerializer.serialize(data as Relationship | Relationship[])
}

export async function serializeEvents<T extends Record<string, unknown>>(
  data: Event<T> | Event<T>[] | null
): Promise<unknown> {
  if (data === null) return { data: null }
  return EventSerializer.serialize(data as Event | Event[])
}

export async function serializeActions<T extends Record<string, unknown>>(
  data: Action<T> | Action<T>[] | null
): Promise<unknown> {
  if (data === null) return { data: null }
  return ActionSerializer.serialize(data as Action | Action[])
}

export async function serializeArtifacts<T>(
  data: Artifact<T> | Artifact<T>[] | null
): Promise<unknown> {
  if (data === null) return { data: null }
  return ArtifactSerializer.serialize(data as Artifact | Artifact[])
}

/**
 * Serialize an error to JSON:API format
 */
export async function serializeError(error: Error | string, status = 500): Promise<unknown> {
  const err = typeof error === 'string' ? new Error(error) : error
  return apiErrorSerializer.serialize(err)
}

/**
 * JSON:API content type
 */
export const JSONAPI_CONTENT_TYPE = 'application/vnd.api+json'
