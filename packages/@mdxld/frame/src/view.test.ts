import { describe, it, expect } from 'vitest'
import { createRegistry, ViewRegistry, isHonestBudget, type RoleSpec } from './view.js'
import { UnknownIdError } from './errors.js'
import { fixtureRegistry } from './fixtures.js'

const listFace = { kind: 'list' as const, keys: ['x'] }
const oneRole: RoleSpec = { id: 'a', title: 'A', markdown: listFace }

describe('View — unknown ids fail closed', () => {
  it('throws on an unknown View id and names every known View id', () => {
    const registry = fixtureRegistry()
    try {
      registry.view('shipment-detials')
      throw new Error('expected a fail-closed throw')
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownIdError)
      const e = error as UnknownIdError
      expect(e.kind).toBe('view')
      expect(e.known).toEqual(['shipment-detail'])
      expect(e.message).toContain('known view ids: shipment-detail')
    }
  })

  it('throws on an unknown Role id and names every known Role id', () => {
    const registry = fixtureRegistry()
    expect(() => registry.role('shipmnt')).toThrow(UnknownIdError)
    expect(() => registry.role('shipmnt')).toThrow(/known role ids: lines, shipment/)
  })

  it('never fuzzy-matches — a near-miss id is still a refusal', () => {
    const registry = fixtureRegistry()
    expect(() => registry.view('Shipment-Detail')).toThrow(UnknownIdError)
  })

  it('refuses at registration a View that selects a Role the registry does not hold', () => {
    const registry = createRegistry().withRoles(oneRole)
    expect(() => registry.withViews({ id: 'v', roles: ['a', 'ghost'], budgets: { markdown: 100 } })).toThrow(UnknownIdError)
    expect(registry.viewIds).toEqual([])
  })
})

describe('View — the declared markdown face is required', () => {
  it('refuses a Role with no markdown face', () => {
    const bad = { id: 'a', title: 'A' } as unknown as RoleSpec
    expect(() => createRegistry().withRoles(bad)).toThrow(/declares no markdown face/)
  })

  it('refuses a Role with an unknown markdown face kind', () => {
    const bad = { id: 'a', title: 'A', markdown: { kind: 'html', keys: ['x'] } } as unknown as RoleSpec
    expect(() => createRegistry().withRoles(bad)).toThrow(/unknown markdown face kind/)
  })

  it('refuses a Role that declares no keys — absent-not-hidden is structural, not opt-in', () => {
    const bad = { id: 'a', title: 'A', markdown: { kind: 'list' } } as unknown as RoleSpec
    expect(() => createRegistry().withRoles(bad)).toThrow(/declares no keys/)
    expect(() => createRegistry().withRoles({ id: 'a', title: 'A', markdown: { kind: 'list', keys: [] } })).toThrow(/declares no keys/)
  })

  it('refuses a duplicate declared key — it would emit the same Field twice', () => {
    expect(() => createRegistry().withRoles({ id: 'a', title: 'A', markdown: { kind: 'list', keys: ['x', 'x'] } })).toThrow(/declares key "x" twice/)
  })

  it('refuses a Role id or key that would break path injectivity', () => {
    expect(() => createRegistry().withRoles({ id: 'a.b', title: 'A', markdown: listFace })).toThrow(/one of \. \[ \]/)
    expect(() => createRegistry().withRoles({ id: 'a', title: 'A', markdown: { kind: 'list', keys: ['x.y'] } })).toThrow(/one of \. \[ \]/)
  })

  it('refuses a Role with no title', () => {
    expect(() => createRegistry().withRoles({ id: 'a', title: '  ', markdown: listFace })).toThrow(/declares no title/)
  })
})

describe('View — the budget is PER FACE', () => {
  const registry = createRegistry().withRoles(oneRole)

  it('refuses a non-positive or non-finite budget for any face', () => {
    for (const budget of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => registry.withViews({ id: 'v', roles: ['a'], budgets: { markdown: budget } })).toThrow(/must be a positive, finite number/)
      expect(() => registry.withViews({ id: 'v', roles: ['a'], budgets: { markdown: 100, data: budget } })).toThrow(/must be a positive, finite number/)
    }
  })

  it('requires a markdown budget — every Role has a markdown face', () => {
    expect(() => registry.withViews({ id: 'v', roles: ['a'], budgets: { data: 900 } })).toThrow(/declares no "markdown" budget/)
    expect(() => registry.withViews({ id: 'v', roles: ['a'], budgets: {} })).toThrow(/declares no "markdown" budget/)
  })

  it('names the faces it does budget for, so the fix is one round trip', () => {
    const view = fixtureRegistry().view('shipment-detail')
    expect(Object.keys(view.budgets).sort()).toEqual(['data', 'markdown'])
    expect(view.budgets.markdown).not.toBe(view.budgets.data)
  })

  it('holds every budget to one predicate', () => {
    expect(isHonestBudget(1)).toBe(true)
    expect(isHonestBudget(0)).toBe(false)
    expect(isHonestBudget(Number.NaN)).toBe(false)
    expect(isHonestBudget('400')).toBe(false)
  })
})

describe('View — a View that shows nothing, or shows it twice', () => {
  const registry = createRegistry().withRoles(oneRole, { id: 'b', title: 'B', markdown: listFace })

  it('refuses a View with no Roles — nothing to disagree about is not agreement', () => {
    expect(() => registry.withViews({ id: 'v', roles: [], budgets: { markdown: 100 } })).toThrow(/selects no Roles/)
  })

  it('refuses a View that selects the same Role twice', () => {
    expect(() => registry.withViews({ id: 'v', roles: ['a', 'b', 'a'], budgets: { markdown: 100 } })).toThrow(/selects Role "a" twice/)
  })

  it('refuses a View with an empty id', () => {
    expect(() => registry.withViews({ id: '   ', roles: ['a'], budgets: { markdown: 100 } })).toThrow(/empty id/)
  })
})

describe('ViewRegistry is immutable, with no public bypass', () => {
  it('returns a new registry rather than mutating the one a Rendering may be holding', () => {
    const base = createRegistry().withRoles(oneRole)
    const extended = base.withRoles({ id: 'b', title: 'B', markdown: listFace })
    expect(base.roleIds).toEqual(['a'])
    expect(extended.roleIds).toEqual(['a', 'b'])
  })

  it('has no public constructor — the bypass around every registration guard is closed', () => {
    // @ts-expect-error the constructor is private: build with createRegistry()
    const bypass = () => new ViewRegistry(new Map(), new Map())
    expect(typeof bypass).toBe('function')
    expect(createRegistry().roleIds).toEqual([])
  })
})
