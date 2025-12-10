/**
 * Type declarations for @mdxdb/sqlite
 *
 * The @mdxdb/sqlite package has dts disabled due to @cloudflare/workers-types
 * compatibility issues, so we provide minimal type declarations for the
 * functions used by mdxai.
 */

declare module '@mdxdb/sqlite' {
  export interface MDXClientConfig {
    namespace: string
    persistPath?: string
    embedFn?: (text: string) => Promise<number[]>
  }

  export interface Thing {
    ns: string
    type: string
    id: string
    url: string
    data: Record<string, unknown>
    content?: string
    createdAt: Date
    updatedAt: Date
  }

  export interface QueryOptions {
    ns?: string
    type?: string
    where?: Record<string, unknown>
    orderBy?: string
    order?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }

  export class MDXClient {
    constructor(stub: unknown, namespace: string, embedFn?: (text: string) => Promise<number[]>)

    // Thing operations
    list(options?: QueryOptions): Promise<Thing[]>
    read(url: string): Promise<Thing | null>
    readById(type: string, id: string): Promise<Thing | null>
    create(options: {
      ns: string
      type: string
      id?: string
      url?: string
      data: Record<string, unknown>
      content?: string
    }): Promise<Thing>
    update(url: string, options: { data?: Record<string, unknown>; content?: string }): Promise<Thing>
    upsert(options: {
      ns: string
      type: string
      id?: string
      url?: string
      data: Record<string, unknown>
      content?: string
    }): Promise<Thing>
    remove(url: string): Promise<boolean>
    search(options: { query: string; type?: string; limit?: number }): Promise<Thing[]>
  }

  export interface DurableObjectId {
    toString(): string
    name?: string
  }

  export interface MDXDatabaseRPC {
    list(options?: QueryOptions): Promise<Thing[]>
    read(url: string): Promise<Thing | null>
    readById(type: string, id: string): Promise<Thing | null>
    create(options: unknown): Promise<Thing>
    update(url: string, options: unknown): Promise<Thing>
    upsert(options: unknown): Promise<Thing>
    remove(url: string): Promise<boolean>
    search(options: unknown): Promise<Thing[]>
    // ... additional methods omitted for brevity
  }

  export interface DurableObjectNamespace<T = MDXDatabaseRPC> {
    idFromName(name: string): DurableObjectId
    idFromString(id: string): DurableObjectId
    newUniqueId(): DurableObjectId
    get(id: DurableObjectId): DurableObjectStub<T>
  }

  export interface DurableObjectStub<T = MDXDatabaseRPC> extends T {
    id: DurableObjectId
    name?: string
  }

  /**
   * Create an MDXClient using miniflare for local development/testing
   */
  export function createMiniflareClient(config: Omit<MDXClientConfig, 'binding'>): Promise<MDXClient>

  /**
   * Create a miniflare-based Durable Object binding for Node.js
   */
  export function createMiniflareBinding(persistPath?: string): Promise<DurableObjectNamespace<MDXDatabaseRPC>>

  /**
   * Create an in-memory binding for testing (no persistence)
   */
  export function createInMemoryBinding(): DurableObjectNamespace<MDXDatabaseRPC>

  /**
   * Dispose the miniflare instance
   */
  export function disposeMiniflare(): Promise<void>
}
