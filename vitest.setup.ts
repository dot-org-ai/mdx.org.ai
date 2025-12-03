/**
 * Vitest Setup for MDX Tests
 *
 * Provides the full MDX SDK as globals:
 * - $ - Context accessor
 * - db - Database client
 * - ai - AI tools
 * - api - Platform API
 * - on/send - Event handling
 * - Graph functions (extractLinks, extractRelationships, etc.)
 * - Global .should assertions
 */

import { beforeEach, afterEach } from 'vitest'
import { MemoryDBClient } from 'mdxdb'
import { parse, toAst } from 'mdxld'
import type { Thing, DBClient, QueryOptions, RelateOptions, Relationship } from 'mdxdb'

// =============================================================================
// Enable Global .should Assertions
// =============================================================================

interface ShouldAssertion {
  be: ShouldAssertion & {
    a: (type: string) => ShouldAssertion
    an: (type: string) => ShouldAssertion
    above: (n: number) => ShouldAssertion
    below: (n: number) => ShouldAssertion
    within: (min: number, max: number) => ShouldAssertion
    true: ShouldAssertion
    false: ShouldAssertion
    ok: ShouldAssertion
    null: ShouldAssertion
    undefined: ShouldAssertion
    empty: ShouldAssertion
  }
  have: ShouldAssertion & {
    property: (name: string, value?: unknown) => ShouldAssertion
    keys: (...keys: string[]) => ShouldAssertion
    lengthOf: (n: number) => ShouldAssertion
  }
  equal: (expected: unknown) => ShouldAssertion
  deep: { equal: (expected: unknown) => ShouldAssertion }
  include: (value: unknown) => ShouldAssertion
  contain: (value: unknown) => ShouldAssertion
  not: ShouldAssertion
  with: ShouldAssertion
  lengthOf: (n: number) => ShouldAssertion
}

function createShouldChain(actual: unknown, negated = false): ShouldAssertion {
  const check = (condition: boolean, message: string) => {
    const passes = negated ? !condition : condition
    if (!passes) throw new Error(negated ? `Expected NOT: ${message}` : message)
  }

  const chain = (): ShouldAssertion => createShouldChain(actual, negated)

  const assertion: ShouldAssertion = {
    get be() {
      const beObj = {
        a: (type: string) => {
          const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual
          check(actualType === type.toLowerCase(), `Expected ${JSON.stringify(actual)} to be a ${type}`)
          return chain()
        },
        an: (type: string) => beObj.a(type),
        above: (n: number) => {
          check((actual as number) > n, `Expected ${actual} to be above ${n}`)
          return chain()
        },
        below: (n: number) => {
          check((actual as number) < n, `Expected ${actual} to be below ${n}`)
          return chain()
        },
        within: (min: number, max: number) => {
          const n = actual as number
          check(n >= min && n <= max, `Expected ${actual} to be within ${min}..${max}`)
          return chain()
        },
        get true() {
          check(actual === true, `Expected ${actual} to be true`)
          return chain()
        },
        get false() {
          check(actual === false, `Expected ${actual} to be false`)
          return chain()
        },
        get ok() {
          check(!!actual, `Expected ${actual} to be truthy`)
          return chain()
        },
        get null() {
          check(actual === null, `Expected ${actual} to be null`)
          return chain()
        },
        get undefined() {
          check(actual === undefined, `Expected ${actual} to be undefined`)
          return chain()
        },
        get empty() {
          const isEmpty =
            actual === '' ||
            (Array.isArray(actual) && actual.length === 0) ||
            (actual && typeof actual === 'object' && Object.keys(actual).length === 0)
          check(isEmpty, `Expected ${JSON.stringify(actual)} to be empty`)
          return chain()
        },
      }
      return beObj
    },
    get have() {
      const haveObj = {
        property: (name: string, value?: unknown) => {
          const hasIt = actual != null && Object.prototype.hasOwnProperty.call(actual, name)
          if (value !== undefined) {
            check(hasIt && (actual as Record<string, unknown>)[name] === value, `Expected property '${name}' = ${JSON.stringify(value)}`)
          } else {
            check(hasIt, `Expected to have property '${name}'`)
          }
          // Return chain for the property value
          if (hasIt) return createShouldChain((actual as Record<string, unknown>)[name], negated)
          return chain()
        },
        keys: (...keys: string[]) => {
          const actualKeys = Object.keys(actual as object || {})
          check(keys.every((k) => actualKeys.includes(k)), `Expected to have keys ${JSON.stringify(keys)}`)
          return chain()
        },
        lengthOf: (n: number) => {
          const len = (actual as { length?: number })?.length
          check(len === n, `Expected length ${n}, got ${len}`)
          return chain()
        },
      }
      return haveObj
    },
    equal: (expected: unknown) => {
      check(actual === expected, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
      return chain()
    },
    deep: {
      equal: (expected: unknown) => {
        check(JSON.stringify(actual) === JSON.stringify(expected), `Expected deep equal to ${JSON.stringify(expected)}`)
        return chain()
      },
      include: (expected: unknown) => {
        // Check that all properties in expected exist with same values in actual
        if (typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null) {
          const expectedObj = expected as Record<string, unknown>
          const actualObj = actual as Record<string, unknown>
          for (const key of Object.keys(expectedObj)) {
            const matches = JSON.stringify(actualObj[key]) === JSON.stringify(expectedObj[key])
            check(matches, `Expected ${JSON.stringify(actual)} to deeply include ${JSON.stringify(expected)}`)
          }
        }
        return chain()
      },
    },
    include: (value: unknown) => {
      if (typeof actual === 'string') {
        check(actual.includes(String(value)), `Expected "${actual}" to include "${value}"`)
      } else if (Array.isArray(actual)) {
        check(actual.includes(value), `Expected array to include ${JSON.stringify(value)}`)
      }
      return chain()
    },
    contain: (value: unknown) => assertion.include(value),
    get not() {
      return createShouldChain(actual, !negated)
    },
    get with() {
      return chain()
    },
    lengthOf: (n: number) => assertion.have.lengthOf(n),
  }

  return assertion
}

// Add .should to Object.prototype
Object.defineProperty(Object.prototype, 'should', {
  get: function (this: unknown) {
    return createShouldChain(this)
  },
  configurable: true,
  enumerable: false,
})

// =============================================================================
// Database Setup
// =============================================================================

const DEFAULT_NS = 'test.example.com'

type DataRecord = Record<string, unknown>

function createTypeProxy(client: DBClient<DataRecord>, type: string, ns: string = DEFAULT_NS) {
  return {
    async create(idOrData: string | DataRecord, maybeData?: DataRecord): Promise<Thing<DataRecord>> {
      const id = typeof idOrData === 'string' ? idOrData : undefined
      const data = typeof idOrData === 'string' ? (maybeData ?? {}) : idOrData
      return client.create({ ns, type, id, data })
    },

    async get(id: string, options?: { create?: DataRecord; generate?: string | { prompt: string } }): Promise<Thing<DataRecord> | null> {
      const url = `https://${ns}/${type}/${id}`
      const result = await client.get(url)
      if (!result && options?.create) {
        return client.create({ ns, type, id, data: options.create })
      }
      if (!result && options?.generate) {
        const prompt = typeof options.generate === 'string' ? options.generate : options.generate.prompt
        return client.create({ ns, type, id, data: { _generated: true, prompt } })
      }
      return result
    },

    async update(id: string, data: DataRecord): Promise<Thing<DataRecord>> {
      const url = `https://${ns}/${type}/${id}`
      await new Promise((r) => setTimeout(r, 1)) // ensure updatedAt differs
      return client.update(url, { data })
    },

    async upsert(id: string, data: DataRecord): Promise<Thing<DataRecord>> {
      return client.upsert({ ns, type, id, data })
    },

    async delete(id: string): Promise<boolean> {
      const url = `https://${ns}/${type}/${id}`
      return client.delete(url)
    },

    async list(options: Partial<QueryOptions> = {}): Promise<Thing<DataRecord>[]> {
      return client.list({ ...options, ns, type })
    },

    async find(options: { where?: DataRecord; limit?: number; offset?: number } = {}): Promise<Thing<DataRecord>[]> {
      // Implement where filtering manually since MemoryDBClient may not handle all operators
      const all = await client.list({ ns, type, limit: options.limit, offset: options.offset })
      if (!options.where) return all
      return all.filter((thing) => {
        for (const [key, value] of Object.entries(options.where!)) {
          if (typeof value === 'object' && value !== null) {
            // Handle operators like $gt, $gte, $lt, $lte
            for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
              const actual = thing.data[key] as number
              if (op === '$gt' && !(actual > (opVal as number))) return false
              if (op === '$gte' && !(actual >= (opVal as number))) return false
              if (op === '$lt' && !(actual < (opVal as number))) return false
              if (op === '$lte' && !(actual <= (opVal as number))) return false
            }
          } else if (thing.data[key] !== value) {
            return false
          }
        }
        return true
      })
    },

    async search(options: { query: string; semantic?: boolean }): Promise<Thing<DataRecord>[]> {
      return client.search({ ...options, ns, type })
    },

    async forEach(
      optionsOrCallback: Partial<QueryOptions> | ((thing: Thing<DataRecord>) => void | Promise<void>),
      maybeCallback?: (thing: Thing<DataRecord>) => void | Promise<void>
    ): Promise<void> {
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!
      return client.forEach({ ...options, ns, type }, callback)
    },
  }
}

function createDatabaseProxy(client: DBClient<DataRecord>, ns: string = DEFAULT_NS) {
  const cache = new Map<string, ReturnType<typeof createTypeProxy>>()

  return new Proxy({} as Record<string, ReturnType<typeof createTypeProxy>> & {
    get: (urlOrId: string) => Promise<Thing<DataRecord> | null>
    create: (url: string, data: DataRecord) => Promise<Thing<DataRecord>>
    relate: typeof client.relate
    related: typeof client.related
    relationships: typeof client.relationships
  }, {
    get(_, prop: string) {
      if (prop === 'get') {
        return async (urlOrId: string) => {
          if (urlOrId.startsWith('http')) return client.get(urlOrId)
          if (urlOrId.includes('/')) {
            const [type, ...idParts] = urlOrId.split('/')
            const id = idParts.join('/')
            return client.get(`https://${ns}/${type}/${id}`)
          }
          return null
        }
      }
      if (prop === 'create') {
        return async (url: string, data: DataRecord) => client.set(url, data)
      }
      if (prop === 'relate') return client.relate.bind(client)
      if (prop === 'related') return client.related.bind(client)
      if (prop === 'relationships') return client.relationships.bind(client)

      if (!cache.has(prop)) {
        cache.set(prop, createTypeProxy(client, prop, ns))
      }
      return cache.get(prop)
    },
  })
}

// =============================================================================
// Context ($) Implementation
// =============================================================================

interface ContextState {
  ns: string
  user: DataRecord | null
  request: DataRecord | null
  env: Record<string, string>
  config: DataRecord
}

function createContext(client: DBClient<DataRecord>) {
  const state: ContextState = {
    ns: DEFAULT_NS,
    user: null,
    request: null,
    env: { NODE_ENV: 'test' },
    config: {},
  }

  const ctx = {
    get ns() { return state.ns },
    set ns(v: string) { state.ns = v },
    get user() { return state.user },
    set user(v: DataRecord | null) { state.user = v },
    get request() { return state.request },
    set request(v: DataRecord | null) { state.request = v },
    get env() { return state.env },
    get config() { return state.config },
    set config(v: DataRecord) { Object.assign(state.config, v) },
    get db() { return createDatabaseProxy(client, state.ns) },

    async scope<T>(newCtx: Partial<ContextState>, fn: () => Promise<T>): Promise<T> {
      const prev = { ...state }
      Object.assign(state, newCtx)
      try {
        return await fn()
      } finally {
        Object.assign(state, prev)
      }
    },
  }

  return ctx
}

// =============================================================================
// API Implementation
// =============================================================================

function createAPI(client: DBClient<DataRecord>) {
  const dbProxy = createDatabaseProxy(client)

  return {
    db: {
      ...dbProxy,
      namespace: (ns: string) => createDatabaseProxy(client, ns),
    },

    fn: (name: string, schema: DataRecord, handler: (...args: unknown[]) => Promise<unknown>) => {
      const fn = async (input: DataRecord) => {
        // TODO: Add validation based on schema
        return handler(input)
      }
      fn.schema = schema
      fn.name = name
      return fn
    },

    workflow: (name: string, config: DataRecord) => {
      return {
        name,
        config,
        trigger: async (event: DataRecord) => ({ workflowId: `wf_${Date.now()}`, event }),
        run: async (input: DataRecord) => ({ result: input }),
      }
    },

    agent: (name: string, config: DataRecord) => {
      return {
        name,
        config,
        run: async (input: DataRecord) => ({ response: `Agent ${name} processed: ${JSON.stringify(input)}` }),
      }
    },

    storage: {
      put: async (key: string, value: unknown) => ({ key, size: JSON.stringify(value).length }),
      get: async (key: string) => null,
      delete: async (key: string) => true,
      list: async (prefix?: string) => [],
    },
  }
}

// =============================================================================
// AI Implementation
// =============================================================================

function createAI(client: DBClient<DataRecord>) {
  return {
    createDatabaseTools: (db: ReturnType<typeof createDatabaseProxy>) => [
      {
        name: 'mdxdb_list',
        description: 'List documents',
        handler: async (args: { type?: string }) => {
          const result = args.type ? await (db as any)[args.type].list() : []
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
        },
      },
      {
        name: 'mdxdb_search',
        description: 'Search documents',
        handler: async (args: { query: string; type?: string }) => {
          const result = await client.search({ query: args.query, type: args.type })
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
        },
      },
      {
        name: 'mdxdb_get',
        description: 'Get a document',
        handler: async (args: { id: string }) => {
          const result = await (db as any).get(args.id)
          if (!result) return { isError: true, content: [{ type: 'text', text: `not found: ${args.id}` }] }
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
        },
      },
      {
        name: 'mdxdb_set',
        description: 'Set a document',
        handler: async (args: { url: string; data: DataRecord }) => {
          await client.set(args.url, args.data)
          return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
        },
      },
      {
        name: 'mdxdb_delete',
        description: 'Delete a document',
        handler: async (args: { id: string }) => {
          const [type, ...idParts] = args.id.split('/')
          const deleted = await (db as any)[type]?.delete(idParts.join('/')) ?? false
          return { content: [{ type: 'text', text: JSON.stringify({ deleted }) }] }
        },
      },
    ],

    generate: async (prompt: string) => ({ text: `Generated response for: ${prompt}` }),
    embed: async (text: string) => ({ embedding: new Array(1536).fill(0).map(() => Math.random()) }),
  }
}

// =============================================================================
// Graph Functions
// =============================================================================

interface Link {
  url: string
  text: string
  type: 'link' | 'image'
}

interface RelationshipDef {
  type: string
  target: string
  targetType?: string
}

function extractLinks(doc: { content: string; data?: DataRecord }, options?: { baseUrl?: string }): Link[] {
  const baseUrl = options?.baseUrl || 'https://example.com'
  const links: Link[] = []

  // Match markdown links [text](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = linkRegex.exec(doc.content)) !== null) {
    const [, text, url] = match
    const isImage = doc.content.charAt(match.index - 1) === '!'
    let resolvedUrl = url
    if (url.startsWith('/')) {
      resolvedUrl = new URL(url, baseUrl).toString()
    }
    if (isImage) {
      // Already captured, will be caught by image regex
    } else {
      links.push({ url: resolvedUrl, text, type: 'link' })
    }
  }

  // Match markdown images ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  while ((match = imageRegex.exec(doc.content)) !== null) {
    const [, alt, url] = match
    links.push({ url, text: alt, type: 'image' })
  }

  return links
}

function extractRelationships(doc: { data?: DataRecord }): RelationshipDef[] {
  const rels: RelationshipDef[] = []
  const data = doc.data || {}

  // Check for $references, $relatedTo, author, etc.
  if (data.$references) {
    for (const ref of Array.isArray(data.$references) ? data.$references : [data.$references]) {
      rels.push({ type: 'references', target: ref as string })
    }
  }
  if (data.$relatedTo) {
    for (const rel of Array.isArray(data.$relatedTo) ? data.$relatedTo : [data.$relatedTo]) {
      rels.push({ type: 'relatedTo', target: rel as string })
    }
  }
  if (data.author && typeof data.author === 'string' && data.author.startsWith('http')) {
    rels.push({ type: 'author', target: data.author, targetType: 'Author' })
  }
  if (data.category && typeof data.category === 'string' && data.category.startsWith('http')) {
    rels.push({ type: 'category', target: data.category, targetType: 'Category' })
  }

  return rels
}

function withRelationships<T extends DataRecord>(doc: T, relationships: RelationshipDef[]): T & { _relationships: RelationshipDef[] } {
  return { ...doc, _relationships: relationships }
}

function resolveUrl(parts: { ns?: string; type?: string; id?: string } | string): string {
  if (typeof parts === 'string') return parts
  const ns = parts.ns || DEFAULT_NS
  const type = parts.type || 'Thing'
  const id = parts.id || ''
  return `https://${ns}/${type}/${id}`
}

// =============================================================================
// Render Functions (Markdown/TOC)
// =============================================================================

interface TocEntry {
  level: number
  text: string
  slug: string
}

function createRender() {
  return {
    /**
     * Render MDX content to markdown
     */
    markdown(content: string, options: { includeFrontmatter?: boolean } = {}): string {
      const { includeFrontmatter = false } = options

      // Extract frontmatter and body
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]!
        const body = frontmatterMatch[2]!

        if (includeFrontmatter) {
          return `---\n${frontmatter}\n---\n${body}`
        }
        return body.trim()
      }

      return content.trim()
    },

    /**
     * Extract table of contents from markdown content
     */
    toc(content: string): TocEntry[] {
      const toc: TocEntry[] = []
      const lines = content.split('\n')

      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (match) {
          const level = match[1]!.length
          const text = match[2]!.trim()
          const slug = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
          toc.push({ level, text, slug })
        }
      }

      return toc
    },

    /**
     * Render MDX content to HTML
     */
    html(content: string): string {
      // Simple markdown to HTML conversion for testing
      let html = content
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Paragraphs (simple)
        .split('\n\n')
        .map((p) => (p.startsWith('<') ? p : `<p>${p}</p>`))
        .join('\n')

      return html
    },
  }
}

// =============================================================================
// Event Handling (on/send)
// =============================================================================

const eventHandlers = new Map<string, ((event: DataRecord) => void | Promise<void>)[]>()

function on(eventType: string, handler: (event: DataRecord) => void | Promise<void>) {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, [])
  }
  eventHandlers.get(eventType)!.push(handler)
  return () => {
    const handlers = eventHandlers.get(eventType)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx !== -1) handlers.splice(idx, 1)
    }
  }
}

async function send(eventType: string, data: DataRecord) {
  const handlers = eventHandlers.get(eventType) || []
  for (const handler of handlers) {
    await handler({ type: eventType, data, timestamp: new Date() })
  }
}

// =============================================================================
// Global Setup
// =============================================================================

let memoryClient: MemoryDBClient
let dbProxy: ReturnType<typeof createDatabaseProxy>
let ctx: ReturnType<typeof createContext>
let apiInstance: ReturnType<typeof createAPI>
let aiInstance: ReturnType<typeof createAI>

beforeEach(() => {
  memoryClient = new MemoryDBClient({ ns: DEFAULT_NS })
  dbProxy = createDatabaseProxy(memoryClient)
  ctx = createContext(memoryClient)
  apiInstance = createAPI(memoryClient)
  aiInstance = createAI(memoryClient)
  eventHandlers.clear()

  // Set globals
  const g = globalThis as any
  g.db = dbProxy
  g.$ = ctx
  g.api = apiInstance
  g.ai = aiInstance
  g.on = on
  g.send = send
  g.parse = parse
  g.toAst = toAst
  g.extractLinks = extractLinks
  g.extractRelationships = extractRelationships
  g.withRelationships = withRelationships
  g.resolveUrl = resolveUrl
  g.render = createRender()
})

afterEach(() => {
  eventHandlers.clear()
})

// Export for direct usage
export {
  createDatabaseProxy,
  createContext,
  createAPI,
  createAI,
  createTypeProxy,
  extractLinks,
  extractRelationships,
  withRelationships,
  resolveUrl,
  on,
  send,
}
