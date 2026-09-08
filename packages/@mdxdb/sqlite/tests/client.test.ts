/**
 * MDXClient Tests (node pool)
 *
 * The client is a thin RPC wrapper; these tests use a fake DO namespace
 * to verify binding resolution and method forwarding without workerd.
 */

import { describe, it, expect, vi } from 'vitest'
import { MDXClient, createClient } from '../src/client.js'
import type { MDXDatabaseRPC } from '../src/types.js'

type Stub = Record<string, ReturnType<typeof vi.fn>>

function fakeBinding() {
  const stub: Stub = {}
  for (const method of [
    '$id', 'list', 'get', 'getById', 'create', 'update', 'upsert', 'delete',
    'relate', 'unrelate', 'related', 'relatedBy', 'relationships',
  ]) {
    stub[method] = vi.fn(async (...args: unknown[]) => ({ method, args }))
  }
  const idFromName = vi.fn((name: string) => ({ name, toString: () => `id:${name}` }))
  const get = vi.fn(() => stub)
  const binding = { idFromName, get } as unknown as DurableObjectNamespace<MDXDatabaseRPC>
  return { binding, stub, idFromName, get }
}

describe('MDXClient', () => {
  it('requires a binding', () => {
    expect(() => new MDXClient({ $id: 'x.local' })).toThrow(/requires a binding/)
  })

  it('resolves the DO stub from the $id', () => {
    const { binding, idFromName, get } = fakeBinding()
    const client = new MDXClient({ $id: 'example.com', binding })
    expect(idFromName).toHaveBeenCalledWith('example.com')
    expect(get).toHaveBeenCalledTimes(1)
    expect(client.$id()).toBe('example.com')
  })

  it('createClient returns an MDXClient', () => {
    const { binding } = fakeBinding()
    expect(createClient({ $id: 'example.com', binding })).toBeInstanceOf(MDXClient)
  })

  it('forwards thing operations to the stub with the same arguments', async () => {
    const { binding, stub } = fakeBinding()
    const client = new MDXClient({ $id: 'example.com', binding })
    const url = 'https://example.com/Post/1'

    await client.list({ type: 'Post', limit: 5 })
    expect(stub.list).toHaveBeenCalledWith({ type: 'Post', limit: 5 })

    await client.get(url)
    expect(stub.get).toHaveBeenCalledWith(url)

    await client.getById('Post', '1')
    expect(stub.getById).toHaveBeenCalledWith('Post', '1')

    await client.create({ type: 'Post', id: '1', data: { a: 1 } })
    expect(stub.create).toHaveBeenCalledWith({ type: 'Post', id: '1', data: { a: 1 } })

    await client.update(url, { data: { a: 2 }, version: 1 })
    expect(stub.update).toHaveBeenCalledWith(url, { data: { a: 2 }, version: 1 })

    await client.upsert({ type: 'Post', id: '1', data: {} })
    expect(stub.upsert).toHaveBeenCalledWith({ type: 'Post', id: '1', data: {} })

    await client.delete(url)
    expect(stub.delete).toHaveBeenCalledWith(url)
  })

  it('forwards relationship operations to the stub', async () => {
    const { binding, stub } = fakeBinding()
    const client = new MDXClient({ $id: 'example.com', binding })
    const from = 'https://example.com/Post/1'
    const to = 'https://example.com/User/1'

    await client.relate({ predicate: 'author', reverse: 'posts', from, to })
    expect(stub.relate).toHaveBeenCalledWith({ predicate: 'author', reverse: 'posts', from, to })

    await client.unrelate(from, 'author', to)
    expect(stub.unrelate).toHaveBeenCalledWith(from, 'author', to)

    await client.related(from, 'author')
    expect(stub.related).toHaveBeenCalledWith(from, 'author')

    await client.relatedBy(to, 'posts')
    expect(stub.relatedBy).toHaveBeenCalledWith(to, 'posts')

    await client.relationships(from, { predicate: 'author' })
    expect(stub.relationships).toHaveBeenCalledWith(from, { predicate: 'author' })
  })

  it('getDatabaseSize is a sync placeholder over RPC', () => {
    const { binding } = fakeBinding()
    expect(new MDXClient({ $id: 'example.com', binding }).getDatabaseSize()).toBe(0)
  })
})
