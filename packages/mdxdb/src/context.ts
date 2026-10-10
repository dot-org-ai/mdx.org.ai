/**
 * Per-instance provider routing
 *
 * ai-database 2.4 keeps one process-wide provider for entity operations:
 * `db.Post.get()`, the relation getters on hydrated entities and DBPromise
 * pipelining all call its module-global `resolveProvider()`, never the
 * `provider` option (model gap mdx-8je.56). Registering each `DB()`'s
 * provider globally — the first workaround — made the *newest* instance the
 * backend for every instance, so a per-request `DB(schema, { env })` in a
 * Worker routed an older request's reads and writes to a newer request's
 * Durable Object (mdx-8je.65).
 *
 * This module closes that hole without touching ai-database:
 *
 * - One `ProviderRouter` is installed as ai-database's global provider. Every
 *   call it receives is forwarded to the provider of the `DB()` instance that
 *   is current in the async context (`AsyncLocalStorage`).
 * - `bindInstance()` wraps the object ai-database's `DB()` returns so that
 *   each entity operation, DBPromise step, and relation getter runs inside its
 *   own instance's context. Control objects (functions, promises, DBPromises,
 *   relation thenables) are proxied; entities are plain data and are rebound
 *   in place, so what you get back is still an ordinary object.
 * - Outside any instance context the router serves the sole instance when
 *   there is exactly one, and fails closed with `NoInstanceContextError`
 *   otherwise — never a silent cross-instance read or write.
 *
 * Cloudflare Workers need the `nodejs_als` (or `nodejs_compat`)
 * compatibility flag for `AsyncLocalStorage`.
 *
 * @packageDocumentation
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'

type Rec = Record<string, unknown>
type Thenable = { then: (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => unknown }

const context = new AsyncLocalStorage<DBProvider>()

/**
 * Thrown when an ai-database entity operation reaches the router outside any
 * `DB()` instance context while more than one instance exists in the process.
 */
export class NoInstanceContextError extends Error {
  readonly code = 'NO_INSTANCE_CONTEXT'
  constructor(readonly instances: number) {
    super(
      `mdxdb: entity operation outside a DB() instance context with ${instances} DB() instances alive. ` +
        `Call entity operations through the object DB() returned (db.Post.get(), post.author, …). ` +
        `ai-database routes entity operations through one process-wide provider (mdx-8je.56); ` +
        `mdxdb refuses to guess which instance you meant.`
    )
    this.name = 'NoInstanceContextError'
  }
}

/**
 * The single provider ai-database sees. Forwards every call to the `DB()`
 * instance current in the async context.
 */
export class ProviderRouter implements DBProvider {
  private count = 0
  private sole?: DBProvider

  /** Register an instance's provider; returns a `run` bound to it. */
  register(provider: DBProvider): <T>(fn: () => T) => T {
    this.count++
    this.sole = this.count === 1 ? provider : undefined
    return (fn) => context.run(provider, fn)
  }

  /** Number of `DB()` instances registered in this process. */
  get instances(): number {
    return this.count
  }

  /** The provider for the current async context. */
  current(): DBProvider {
    const inContext = context.getStore()
    if (inContext) return inContext
    if (this.sole) return this.sole
    throw new NoInstanceContextError(this.count)
  }

  get(type: string, id: string): Promise<Rec | null> {
    return this.current().get(type, id)
  }
  list(type: string, options?: ListOptions): Promise<Rec[]> {
    return this.current().list(type, options)
  }
  search(type: string, query: string, options?: SearchOptions): Promise<Rec[]> {
    return this.current().search(type, query, options)
  }
  create(type: string, id: string | undefined, data: Rec): Promise<Rec> {
    return this.current().create(type, id, data)
  }
  update(type: string, id: string, data: Rec): Promise<Rec> {
    return this.current().update(type, id, data)
  }
  delete(type: string, id: string): Promise<boolean> {
    return this.current().delete(type, id)
  }
  related(type: string, id: string, relation: string): Promise<Rec[]> {
    return this.current().related(type, id, relation)
  }
  relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string,
    metadata?: { matchMode?: 'exact' | 'fuzzy'; similarity?: number; matchedType?: string }
  ): Promise<void> {
    return this.current().relate(fromType, fromId, relation, toType, toId, metadata)
  }
  unrelate(fromType: string, fromId: string, relation: string, toType: string, toId: string): Promise<void> {
    return this.current().unrelate(fromType, fromId, relation, toType, toId)
  }
}

/** The process-wide router `DB()` installs into ai-database. */
export const router = new ProviderRouter()

/** The provider of the `DB()` instance current in this async context, if any. */
export function currentProvider(): DBProvider | undefined {
  return context.getStore()
}

function isThenable(value: unknown): value is Thenable {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as Partial<Thenable>).then === 'function'
  )
}

function isPlainObject(value: unknown): value is Rec {
  if (typeof value !== 'object' || value === null) return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Bind the object ai-database's `DB()` returned to one instance's provider.
 *
 * Every property read, call, DBPromise step and relation getter on the
 * result runs inside `run`, so the router forwards to `provider`.
 */
export function bindInstance<T extends object>(db: T, provider: DBProvider): T {
  const run = router.register(provider)
  const targets = new WeakMap<object, object>() // proxy -> target
  const proxies = new WeakMap<object, object>() // target -> proxy
  const rebound = new WeakSet<object>()

  const unwrap = (value: unknown): unknown =>
    typeof value === 'object' || typeof value === 'function' ? (targets.get(value as object) ?? value) : value

  /** `then` that resolves inside the instance context and binds the value. */
  function boundThen(target: Thenable) {
    return (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown): unknown => {
      const outer = context.getStore()
      const restore = <R>(fn: () => R): R => (outer ? context.run(outer, fn) : context.exit(fn))
      const fulfilled = (value: unknown): unknown => {
        const bound = bind(value)
        return onFulfilled ? restore(() => onFulfilled(bound)) : bound
      }
      const rejected = onRejected ? (error: unknown): unknown => restore(() => onRejected(error)) : undefined
      return run(() => bind(target.then(fulfilled, rejected)))
    }
  }

  /** Proxy a control object (function, promise, DBPromise, relation thenable). */
  function control<V extends object>(target: V): V {
    const cached = proxies.get(target)
    if (cached) return cached as V
    const proxy = new Proxy(target, {
      get(t, prop) {
        const desc = Reflect.getOwnPropertyDescriptor(t, prop)
        // Proxy invariant: non-configurable, non-writable data properties must come back as-is.
        if (desc && !desc.configurable && !desc.writable && 'value' in desc) return desc.value
        if (prop === 'then' && isThenable(t)) return boundThen(t)
        return run(() => bind(Reflect.get(t, prop, t)))
      },
      apply(t, thisArg, args: unknown[]) {
        return run(() => bind(Reflect.apply(t as (...a: unknown[]) => unknown, unwrap(thisArg), args)))
      },
    })
    targets.set(proxy, target)
    proxies.set(target, proxy)
    return proxy
  }

  /** Rebind a hydrated entity (or an array of them) in place. */
  function rebindData(value: object): void {
    if (rebound.has(value)) return
    rebound.add(value)

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item: unknown = value[i]
        if (isPlainObject(item)) rebindData(item)
      }
      // Backward array relations are arrays with their own `then`.
      const desc = Reflect.getOwnPropertyDescriptor(value, 'then')
      if (desc?.writable && typeof desc.value === 'function') {
        const then = desc.value as Thenable['then']
        ;(value as unknown as Thenable).then = boundThen({ then: (f, r) => then.call(value, f, r) })
      }
      return
    }

    for (const key of Reflect.ownKeys(value)) {
      const desc = Reflect.getOwnPropertyDescriptor(value, key)
      if (!desc || !desc.configurable) continue
      if (desc.get) {
        // Lazy relation getter: run it (and what it resolves to) in this instance's context.
        const get = desc.get
        Object.defineProperty(value, key, { ...desc, get: () => run(() => bind(get.call(value))) })
      } else if (desc.writable && isThenable(desc.value)) {
        // Relation thenable (single backward ref, `then`-carrying array).
        Object.defineProperty(value, key, { ...desc, value: bind(desc.value) })
      }
    }
  }

  /** Bind whatever an operation handed back. */
  function bind<V>(value: V): V {
    if (typeof value === 'function') return control(value as object) as V
    if (typeof value !== 'object' || value === null) return value
    if (targets.has(value)) return value
    if (Array.isArray(value) || isPlainObject(value)) {
      // Entities and entity arrays stay plain data; only their relation
      // getters / thenables are rebound, in place.
      rebindData(value)
      return value
    }
    if (isThenable(value)) return control(value)
    return value
  }

  return control(db)
}
