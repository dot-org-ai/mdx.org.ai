/**
 * Type-level witness for mdx-8je.29: the capnweb RPC symbols that the docs
 * point at (`RPC`, `RPCPromise`) must actually compile out of rpc.do.
 *
 * This file is compiled by tsc through the vitest typecheck lane
 * (vitest.repo.config.ts -> test/repo/tsconfig.json), so if rpc.do stops
 * shipping either symbol `pnpm test:repo` goes red with a real TS2305 - the
 * failure mode the old source-text regex in removed-packages.test.ts could not
 * see.
 */
import { describe, expectTypeOf, it } from 'vitest'
import { RPC, capnweb, type RPCPromise, type RPCProxy } from 'rpc.do'

describe('capnweb RPC types come from rpc.do (mdx-8je.29)', () => {
  it('RPC is a callable that builds a typed proxy', () => {
    expectTypeOf(RPC).toBeFunction()
    expectTypeOf(RPC<{ hello: () => string }>('https://functions.example.com')).toMatchTypeOf<RPCProxy<{ hello: () => string }>>()
  })

  it('RPCPromise<T> awaits to T', () => {
    expectTypeOf<RPCPromise<number>>().toMatchTypeOf<Promise<number>>()
    expectTypeOf<Awaited<RPCPromise<number>>>().toEqualTypeOf<number>()
  })

  it('capnweb is the transport factory', () => {
    expectTypeOf(capnweb).toBeFunction()
  })
})
