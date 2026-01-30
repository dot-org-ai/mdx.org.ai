/**
 * Parquet Export Utilities
 *
 * Utilities for exporting DO data to parquet format.
 *
 * @packageDocumentation
 */

import { writeThings, writeRelationshipsIndexed } from '@mdxdb/parquet'
import type { Thing, Relationship } from '@mdxdb/sqlite'
import type { ExportOptions, MDXDurableObjectRPC, ChildInfo } from './types.js'

/**
 * Export a single DO to parquet
 */
export async function exportDO(
  db: MDXDurableObjectRPC,
  options: ExportOptions = {}
): Promise<{ things: ArrayBuffer; relationships: ArrayBuffer }> {
  // Get all things
  let things = await db.list({ limit: 10000 })

  // Filter by types
  if (options.types && options.types.length > 0) {
    things = things.filter(t => options.types!.includes(t.type))
  }

  // Filter by since date
  if (options.since) {
    things = things.filter(t => t.at >= options.since!)
  }

  // Get all relationships
  const allRels: Relationship[] = []
  for (const thing of things) {
    const rels = await db.relationships(thing.url)
    allRels.push(...rels)
  }

  // Write to parquet
  const thingsBuffer = await writeThings(things, { compression: options.compression })
  const relsBuffer = await writeRelationshipsIndexed(allRels, { compression: options.compression })

  return {
    things: thingsBuffer,
    relationships: relsBuffer,
  }
}

/**
 * Export DO with children (recursive)
 */
export async function exportDOWithChildren(
  db: MDXDurableObjectRPC,
  getChildStub: (child: ChildInfo) => MDXDurableObjectRPC,
  options: ExportOptions = {}
): Promise<{ things: ArrayBuffer; relationships: ArrayBuffer }[]> {
  const results: { things: ArrayBuffer; relationships: ArrayBuffer }[] = []
  const maxDepth = options.maxDepth ?? 3

  async function exportRecursive(
    current: MDXDurableObjectRPC,
    depth: number
  ): Promise<void> {
    // Export this DO
    const exported = await exportDO(current, options)
    results.push(exported)

    // Stop if max depth reached
    if (depth >= maxDepth) return

    // Export children
    if (options.includeChildren !== false) {
      const children = await current.getChildren()
      for (const child of children) {
        const childStub = getChildStub(child)
        await exportRecursive(childStub, depth + 1)
      }
    }
  }

  await exportRecursive(db, 0)
  return results
}

/**
 * Merge multiple parquet buffers into one
 * Note: This is a placeholder - full implementation would need to combine row groups
 */
export async function mergeParquetBuffers(
  buffers: ArrayBuffer[]
): Promise<ArrayBuffer> {
  if (buffers.length === 0) {
    return new ArrayBuffer(0)
  }
  if (buffers.length === 1) {
    return buffers[0]!
  }

  // For now, just return the first buffer
  // TODO: Implement proper parquet merging
  console.warn('mergeParquetBuffers: returning first buffer only (merging not implemented)')
  return buffers[0]!
}
