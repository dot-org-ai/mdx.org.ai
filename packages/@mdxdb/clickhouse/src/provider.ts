/**
 * @mdxdb/clickhouse Provider
 *
 * DBProvider implementation for ClickHouse storage.
 * Wraps ClickHouseDatabase to conform to the schema-first interface.
 */

import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'
import {
  ClickHouseDatabase,
  createClickHouseDatabase,
  type ClickHouseConfig,
} from './index.js'

/**
 * ClickHouse-based DBProvider
 */
export class ClickHouseProvider implements DBProvider {
  private db: ClickHouseDatabase
  private ns: string

  constructor(db: ClickHouseDatabase, ns: string = 'localhost') {
    this.db = db
    this.ns = ns
  }

  private buildUrl(type: string, id: string): string {
    return `https://${this.ns}/${type}/${id}`
  }

  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    const thing = await this.db.getById(this.ns, type, id)
    if (!thing) return null

    return {
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }
  }

  async list(type: string, options?: ListOptions): Promise<Record<string, unknown>[]> {
    const things = await this.db.list({
      ns: this.ns,
      type,
      where: options?.where,
      orderBy: options?.orderBy,
      order: options?.order,
      limit: options?.limit,
      offset: options?.offset,
    })

    return things.map((thing) => ({
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }))
  }

  async search(
    type: string,
    query: string,
    options?: SearchOptions
  ): Promise<Record<string, unknown>[]> {
    const things = await this.db.search({
      query,
      ns: this.ns,
      type,
      limit: options?.limit,
      offset: options?.offset,
      minScore: options?.minScore,
    })

    return things.map((thing) => ({
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }))
  }

  async create(
    type: string,
    id: string | undefined,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const thing = await this.db.create({
      ns: this.ns,
      type,
      id,
      data: data as Record<string, unknown>,
    })

    return {
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }
  }

  async update(
    type: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = this.buildUrl(type, id)
    const thing = await this.db.update(url, { data: data as Record<string, unknown> })

    return {
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }
  }

  async delete(type: string, id: string): Promise<boolean> {
    const url = this.buildUrl(type, id)
    return this.db.delete(url)
  }

  async related(
    type: string,
    id: string,
    relation: string
  ): Promise<Record<string, unknown>[]> {
    const url = this.buildUrl(type, id)
    const things = await this.db.related(url, relation, 'from')

    return things.map((thing) => ({
      $id: thing.id,
      $type: thing.type,
      ...thing.data,
    }))
  }

  async relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string
  ): Promise<void> {
    await this.db.relate({
      type: relation,
      from: this.buildUrl(fromType, fromId),
      to: this.buildUrl(toType, toId),
    })
  }

  async unrelate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string
  ): Promise<void> {
    await this.db.unrelate(
      this.buildUrl(fromType, fromId),
      relation,
      this.buildUrl(toType, toId)
    )
  }

  async close(): Promise<void> {
    await this.db.close()
  }
}

/**
 * Create a ClickHouse-based provider
 */
export async function createClickhouseProvider(
  config: ClickHouseConfig & { ns?: string }
): Promise<ClickHouseProvider> {
  const db = await createClickHouseDatabase(config)
  return new ClickHouseProvider(db, config.ns ?? 'localhost')
}
