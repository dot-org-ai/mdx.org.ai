import { describe, it, expect } from 'vitest'
import { createRegistry } from './view.js'
import { UnknownIdError } from './errors.js'
import { fixtureRegistry } from './fixtures.js'

const listFace = { kind: 'list' as const }

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
    const registry = createRegistry().withRoles({ id: 'a', title: 'A', markdown: listFace })
    expect(() => registry.withViews({ id: 'v', roles: ['a', 'ghost'], budget: 100 })).toThrow(UnknownIdError)
    expect(registry.viewIds).toEqual([])
  })
})

describe('View — the declared markdown face is required', () => {
  it('refuses a Role with no markdown face', () => {
    const bad = { id: 'a', title: 'A' } as unknown as Parameters<ReturnType<typeof createRegistry>['withRoles']>[0]
    expect(() => createRegistry().withRoles(bad)).toThrow(/declares no markdown face/)
  })

  it('refuses a Role with an unknown markdown face kind', () => {
    const bad = { id: 'a', title: 'A', markdown: { kind: 'html' } } as unknown as Parameters<ReturnType<typeof createRegistry>['withRoles']>[0]
    expect(() => createRegistry().withRoles(bad)).toThrow(/unknown markdown face kind/)
  })
})

describe('View — the budget is part of the standing definition', () => {
  it('refuses a non-positive or non-finite budget', () => {
    const registry = createRegistry().withRoles({ id: 'a', title: 'A', markdown: listFace })
    for (const budget of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => registry.withViews({ id: 'v', roles: ['a'], budget })).toThrow(/token budget must be a positive, finite number/)
    }
  })
})

describe('ViewRegistry is immutable', () => {
  it('returns a new registry rather than mutating the one a Rendering may be holding', () => {
    const base = createRegistry().withRoles({ id: 'a', title: 'A', markdown: listFace })
    const extended = base.withRoles({ id: 'b', title: 'B', markdown: listFace })
    expect(base.roleIds).toEqual(['a'])
    expect(extended.roleIds).toEqual(['a', 'b'])
  })
})
