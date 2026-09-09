/**
 * Lazy provider
 *
 * `DB()` is synchronous but resolving a provider is not (adapters load on
 * demand). The lazy provider is a `DBProvider` whose first call awaits the
 * factory and every call delegates to the result. Only the base
 * `DBProvider` surface is exposed so ai-database's capability guards
 * (`'semanticSearch' in provider`, …) stay false until you reach the real
 * provider through `resolved()`.
 *
 * @packageDocumentation
 */

import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'

type Rec = Record<string, unknown>

export class LazyProvider implements DBProvider {
  private provider?: DBProvider
  private pending?: Promise<DBProvider>

  constructor(private readonly factory: () => Promise<DBProvider>) {}

  /** The real provider (resolving it on first use). */
  resolved(): Promise<DBProvider> {
    if (this.provider) return Promise.resolve(this.provider)
    if (!this.pending) {
      this.pending = this.factory()
        .then((p) => {
          this.provider = p
          return p
        })
        .catch((err: unknown) => {
          // Let the next call retry instead of caching a transient failure.
          this.pending = undefined
          throw err
        })
    }
    return this.pending
  }

  /** Whether the factory has completed. */
  get isResolved(): boolean {
    return this.provider !== undefined
  }

  async get(type: string, id: string): Promise<Rec | null> {
    return (await this.resolved()).get(type, id)
  }
  async list(type: string, options?: ListOptions): Promise<Rec[]> {
    return (await this.resolved()).list(type, options)
  }
  async search(type: string, query: string, options?: SearchOptions): Promise<Rec[]> {
    return (await this.resolved()).search(type, query, options)
  }
  async create(type: string, id: string | undefined, data: Rec): Promise<Rec> {
    return (await this.resolved()).create(type, id, data)
  }
  async update(type: string, id: string, data: Rec): Promise<Rec> {
    return (await this.resolved()).update(type, id, data)
  }
  async delete(type: string, id: string): Promise<boolean> {
    return (await this.resolved()).delete(type, id)
  }
  async related(type: string, id: string, relation: string): Promise<Rec[]> {
    return (await this.resolved()).related(type, id, relation)
  }
  async relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string,
    metadata?: { matchMode?: 'exact' | 'fuzzy'; similarity?: number; matchedType?: string }
  ): Promise<void> {
    return (await this.resolved()).relate(fromType, fromId, relation, toType, toId, metadata)
  }
  async unrelate(fromType: string, fromId: string, relation: string, toType: string, toId: string): Promise<void> {
    return (await this.resolved()).unrelate(fromType, fromId, relation, toType, toId)
  }
}

export function createLazyProvider(factory: () => Promise<DBProvider>): LazyProvider {
  return new LazyProvider(factory)
}
