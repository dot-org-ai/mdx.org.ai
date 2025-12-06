/**
 * @mdxdb/sqlite Compliance Tests
 *
 * Uses the unified test suite from ai-database to verify
 * SQLite adapter implements DBClientExtended correctly.
 *
 * The SQLite adapter uses Durable Objects with miniflare for testing.
 * An adapter wrapper is used to map MDXClient methods to the DBClientExtended interface.
 */

import { createExtendedTests, fixtures } from 'ai-database/tests'
import {
  MDXClient,
  createInMemoryBinding,
  type DurableObjectNamespace,
  type MDXDatabaseRPC,
} from '../src/index.js'
import type {
  DBClientExtended,
  Thing,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Relationship,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  ArtifactType,
} from 'ai-database'

// Skip tests if explicitly disabled
const SKIP_COMPLIANCE = process.env.SKIP_SQLITE_COMPLIANCE === 'true'

/**
 * Adapter that wraps MDXClient to conform to DBClientExtended interface
 */
class MDXClientAdapter<TData extends Record<string, unknown> = Record<string, unknown>>
  implements DBClientExtended<TData>
{
  private client: MDXClient
  private ns: string

  constructor(client: MDXClient, ns: string) {
    this.client = client
    this.ns = ns
  }

  // Thing operations
  async list(options?: QueryOptions): Promise<Thing<TData>[]> {
    return this.client.list(options) as Promise<Thing<TData>[]>
  }

  async find(options: QueryOptions): Promise<Thing<TData>[]> {
    // MDXClient doesn't have find, use list with where clause
    return this.client.list(options) as Promise<Thing<TData>[]>
  }

  async search(options: ThingSearchOptions): Promise<Thing<TData>[]> {
    return this.client.search(options) as Promise<Thing<TData>[]>
  }

  async get(url: string): Promise<Thing<TData> | null> {
    return this.client.get(url) as Promise<Thing<TData> | null>
  }

  async getById(ns: string, type: string, id: string): Promise<Thing<TData> | null> {
    // MDXClient's getById takes (type, id), not (ns, type, id)
    // But we can construct the URL and use get instead
    const url = `https://${ns}/${type}/${id}`
    return this.get(url)
  }

  async set(url: string, data: TData): Promise<Thing<TData>> {
    // MDXClient doesn't have set directly, use update
    return this.client.update(url, { data }) as Promise<Thing<TData>>
  }

  async create(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.client.create(options) as Promise<Thing<TData>>
  }

  async update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>> {
    return this.client.update(url, options) as Promise<Thing<TData>>
  }

  async upsert(options: CreateOptions<TData>): Promise<Thing<TData>> {
    return this.client.upsert(options) as Promise<Thing<TData>>
  }

  async delete(url: string): Promise<boolean> {
    return this.client.delete(url)
  }

  // Iteration
  async forEach(
    options: QueryOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void> {
    const things = await this.list(options)
    for (const thing of things) {
      await callback(thing)
    }
  }

  // Relationship operations
  async relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>> {
    return this.client.relate(options) as Promise<Relationship<T>>
  }

  async unrelate(from: string, type: string, to: string): Promise<boolean> {
    return this.client.unrelate(from, type, to)
  }

  async related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]> {
    return this.client.related(url, relationshipType, direction) as Promise<Thing<TData>[]>
  }

  async relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]> {
    return this.client.relationships(url, type, direction)
  }

  async references(url: string, relationshipType?: string): Promise<Thing<TData>[]> {
    // References are inbound relationships (things pointing TO this url)
    // direction='from' means get things that point TO this URL
    return this.related(url, relationshipType, 'from')
  }

  // Event operations
  async track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>> {
    return this.client.track(options) as Promise<Event<T>>
  }

  async getEvent(id: string): Promise<Event | null> {
    return this.client.getEvent(id)
  }

  async queryEvents(options?: EventQueryOptions): Promise<Event[]> {
    return this.client.queryEvents(options)
  }

  // Action operations
  async send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.client.send(options) as Promise<Action<T>>
  }

  async do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>> {
    return this.client.do(options) as Promise<Action<T>>
  }

  async try<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>,
    fn: () => Promise<unknown>
  ): Promise<Action<T>> {
    // Create and start the action
    const action = await this.do<T>(options)

    try {
      // Execute the function
      const result = await fn()
      // Complete on success
      return (await this.completeAction(action.id, result)) as Action<T>
    } catch (error) {
      // Fail on error
      const errorMessage = error instanceof Error ? error.message : String(error)
      return (await this.failAction(action.id, errorMessage)) as Action<T>
    }
  }

  async getAction(id: string): Promise<Action | null> {
    return this.client.getAction(id)
  }

  async queryActions(options?: ActionQueryOptions): Promise<Action[]> {
    return this.client.queryActions(options)
  }

  async startAction(id: string): Promise<Action> {
    return this.client.startAction(id)
  }

  async completeAction(id: string, result?: unknown): Promise<Action> {
    return this.client.completeAction(id, result)
  }

  async failAction(id: string, error: string): Promise<Action> {
    return this.client.failAction(id, error)
  }

  async cancelAction(id: string): Promise<Action> {
    return this.client.cancelAction(id)
  }

  // Artifact operations
  async storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>> {
    return this.client.storeArtifact(options) as Promise<Artifact<T>>
  }

  async getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null> {
    return this.client.getArtifact(key) as Promise<Artifact<T> | null>
  }

  async getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null> {
    return this.client.getArtifactBySource(source, type)
  }

  async deleteArtifact(key: string): Promise<boolean> {
    return this.client.deleteArtifact(key)
  }

  async cleanExpiredArtifacts(): Promise<number> {
    return this.client.cleanExpiredArtifacts()
  }

  async close(): Promise<void> {
    // No cleanup needed for in-memory binding
  }
}

if (!SKIP_COMPLIANCE) {
  createExtendedTests('SQLite', {
    factory: async () => {
      // Create in-memory binding for testing
      const binding = createInMemoryBinding() as DurableObjectNamespace<MDXDatabaseRPC>
      const id = binding.idFromName(fixtures.ns)
      const stub = binding.get(id)
      const client = new MDXClient(stub, fixtures.ns)

      // Return the adapter that conforms to DBClientExtended
      return new MDXClientAdapter(client, fixtures.ns)
    },
    cleanup: async () => {
      // Optional: cleanup in-memory data
    },
    ns: fixtures.ns,
    // Skip tests that may have implementation differences
    skip: {
      // Uncomment if certain features aren't fully implemented
      // search: true,
    },
  })
}
