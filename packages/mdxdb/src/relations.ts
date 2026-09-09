/**
 * Schema relationships
 *
 * ai-database parses `author: 'Author.posts'` into two fields — `Post.author`
 * (declared) and `Author.posts` (auto-created) — but its hydration only
 * follows edges in the declared direction, so `author.posts` comes back
 * empty on every provider (model gap mdx-8je.57). mdxdb
 * closes that gap here, at the provider boundary, so it works the same for
 * every backend:
 *
 * - `schemaRelations()` derives a forward/reverse map from the schema.
 * - `withSchemaRelations()` wraps any `DBProvider` so that creating or
 *   updating an entity records the edge for its single-valued relation
 *   fields, and reading the reverse side resolves through that edge.
 *
 * Providers that understand bidirectional edges natively (`DOProvider`)
 * implement `SchemaAwareProvider`; the wrapper hands them the map and lets
 * them serve the reverse side from their own index instead of emulating it.
 *
 * @packageDocumentation
 */

import type { DatabaseSchema, DBProvider, ListOptions, SearchOptions } from 'ai-database'
import { parseSchema } from 'ai-database'

export type RelationSpec =
  | {
      /** The declared side: `Post.author` → Author */
      direction: 'forward'
      /** Related entity type */
      type: string
      /** Field on the related type that mirrors this edge (`posts`) */
      reverse?: string
      isArray: boolean
    }
  | {
      /** The mirrored side: `Author.posts` ← Post */
      direction: 'reverse'
      /** Related entity type */
      type: string
      /** Field on the related type that owns the edge (`author`) */
      forward: string
      /** Whether the owning field is an array */
      forwardIsArray: boolean
      isArray: boolean
    }

/** `entityType → fieldName → RelationSpec` */
export type SchemaRelations = Record<string, Record<string, RelationSpec>>

/** A provider that serves reverse relations from its own edge index. */
export interface SchemaAwareProvider extends DBProvider {
  setSchemaRelations(relations: SchemaRelations): void
}

export function isSchemaAware(provider: DBProvider): provider is SchemaAwareProvider {
  return typeof (provider as Partial<SchemaAwareProvider>).setSchemaRelations === 'function'
}

/**
 * Derive the relationship map for a schema.
 *
 * A field is *forward* when the user declared it; the auto-created mirror is
 * *reverse*. When both sides are declared, the single-valued side owns the
 * edge; if both are arrays the first one declared wins.
 */
export function schemaRelations(schema: DatabaseSchema): SchemaRelations {
  const parsed = parseSchema(schema)
  const out: SchemaRelations = {}
  const seen = new Set<string>()

  for (const [entityName, entity] of parsed.entities) {
    const declared = (schema[entityName] ?? {}) as Record<string, unknown>
    for (const [fieldName, field] of entity.fields) {
      if (!field.isRelation || !field.relatedType) continue
      const key = `${entityName}.${fieldName}`
      if (seen.has(key)) continue

      const relatedEntity = parsed.entities.get(field.relatedType)
      const mirrorName = field.backref
      const mirror = mirrorName ? relatedEntity?.fields.get(mirrorName) : undefined
      const mirrorDeclared = mirrorName
        ? mirrorName in ((schema[field.relatedType] ?? {}) as Record<string, unknown>)
        : false

      let thisIsForward: boolean
      if (!mirror || !mirrorName) thisIsForward = true
      else if (fieldName in declared && !mirrorDeclared) thisIsForward = true
      else if (!(fieldName in declared) && mirrorDeclared) thisIsForward = false
      else if (!field.isArray && mirror.isArray) thisIsForward = true
      else if (field.isArray && !mirror.isArray) thisIsForward = false
      else thisIsForward = true

      const forwardEntity = thisIsForward ? entityName : field.relatedType
      const forwardField = thisIsForward ? fieldName : mirrorName!
      const forwardIsArray = thisIsForward ? field.isArray : mirror!.isArray
      const reverseEntity = thisIsForward ? field.relatedType : entityName
      const reverseField = thisIsForward ? mirrorName : fieldName
      const reverseIsArray = thisIsForward ? mirror?.isArray : field.isArray

      ;(out[forwardEntity] ??= {})[forwardField] = {
        direction: 'forward',
        type: reverseEntity,
        reverse: reverseField,
        isArray: forwardIsArray,
      }
      seen.add(`${forwardEntity}.${forwardField}`)

      if (reverseField) {
        ;(out[reverseEntity] ??= {})[reverseField] = {
          direction: 'reverse',
          type: forwardEntity,
          forward: forwardField,
          forwardIsArray,
          isArray: reverseIsArray ?? true,
        }
        seen.add(`${reverseEntity}.${reverseField}`)
      }
    }
  }
  return out
}

type Rec = Record<string, unknown>

function singleForwardFields(relations: SchemaRelations, type: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [field, spec] of Object.entries(relations[type] ?? {})) {
    if (spec.direction === 'forward' && !spec.isArray) out.push([field, spec.type])
  }
  return out
}

/**
 * Wrap a provider so single-valued relation fields become edges and reverse
 * fields resolve through them.
 */
export function withSchemaRelations<P extends DBProvider>(provider: P, relations: SchemaRelations): P {
  if (isSchemaAware(provider)) {
    provider.setSchemaRelations(relations)
  }
  const nativeReverse = isSchemaAware(provider)

  const relateSingles = async (type: string, id: string, data: Rec, previous?: Rec | null) => {
    for (const [field, targetType] of singleForwardFields(relations, type)) {
      if (!(field in data)) continue
      const next = data[field]
      const prev = previous?.[field]
      if (prev === next) continue
      if (typeof prev === 'string' && prev) {
        await provider.unrelate(type, id, field, targetType, prev)
      }
      if (typeof next === 'string' && next) {
        await provider.relate(type, id, field, targetType, next)
      }
    }
  }

  const reverseLookup = async (type: string, id: string, relation: string): Promise<Rec[]> => {
    const spec = relations[type]?.[relation]
    if (!spec || spec.direction !== 'reverse') return provider.related(type, id, relation)
    if (nativeReverse) return provider.related(type, id, relation)
    if (!spec.forwardIsArray) {
      return provider.list(spec.type, { where: { [spec.forward]: id } })
    }
    // Owning side is an array: exact `where` cannot match, scan the type.
    const all = await provider.list(spec.type)
    return all.filter((r) => {
      const v = r[spec.forward]
      return Array.isArray(v) && v.includes(id)
    })
  }

  // Prototype chain keeps every other method (semanticSearch, events, …) reachable.
  const wrapped = Object.create(provider) as P & {
    create: DBProvider['create']
    update: DBProvider['update']
    related: DBProvider['related']
  }

  wrapped.create = async (type: string, id: string | undefined, data: Rec) => {
    const created = await provider.create(type, id, data)
    const createdId = String(created['$id'] ?? id ?? '')
    if (createdId) await relateSingles(type, createdId, data)
    return created
  }

  wrapped.update = async (type: string, id: string, data: Rec) => {
    const touches = singleForwardFields(relations, type).some(([f]) => f in data)
    const previous = touches ? await provider.get(type, id) : null
    const updated = await provider.update(type, id, data)
    if (touches) await relateSingles(type, id, data, previous)
    return updated
  }

  wrapped.related = (type: string, id: string, relation: string) => reverseLookup(type, id, relation)

  // Bind every other method (own and inherited) so `this` inside the
  // provider is the provider, never the wrapper.
  const overridden = new Set(['create', 'update', 'related', 'constructor'])
  for (let proto: object | null = provider; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (overridden.has(name) || Object.prototype.hasOwnProperty.call(wrapped, name)) continue
      const desc = Object.getOwnPropertyDescriptor(proto, name)
      if (desc && typeof desc.value === 'function') {
        Object.defineProperty(wrapped, name, {
          value: (desc.value as (...args: unknown[]) => unknown).bind(provider),
          writable: true,
          configurable: true,
          enumerable: desc.enumerable,
        })
      }
    }
  }

  return wrapped
}

export type { ListOptions, SearchOptions }
