import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderData, declareRendering, type EmittedValue } from './render.js'
import { assertFaceParity, faceParity } from './parity.js'
import { FaceParityError } from './errors.js'
import { fixtureFrame, fixtureRegistry } from './fixtures.js'

const registry = fixtureRegistry()
const frame = fixtureFrame()

function faces() {
  return [renderMarkdown(frame, { registry }), renderData(frame, { registry, budget: 5000 })]
}

describe('face parity — the two shipped faces agree', () => {
  it('passes for the markdown and data faces of one Frame', () => {
    expect(faceParity(frame, faces())).toEqual([])
    expect(() => assertFaceParity(frame, faces())).not.toThrow()
  })

  it('holds every Field in the Frame — all eleven, including the absent and withheld ones', () => {
    const [markdown] = faces()
    expect(markdown?.emitted).toHaveLength(11)
    expect(markdown?.emitted.map((e) => e.path)).toContain('shipment.unitPrice')
    expect(markdown?.emitted.find((e) => e.path === 'shipment.temperature')?.presence).toBe('absent')
  })
})

describe('face parity catches an INVENTED value', () => {
  it('fails when a face emits a path the Frame does not hold', () => {
    const [markdown, data] = faces()
    const invented: EmittedValue[] = [
      ...(data?.emitted ?? []),
      { path: 'shipment.margin', presence: 'present', attribution: 'OBS', text: '0.18 [OBS epcis-spine]' },
    ]
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: invented })
    const breaches = faceParity(frame, [markdown!, rogue])
    expect(breaches).toHaveLength(1)
    expect(breaches[0]).toMatchObject({ kind: 'invented', path: 'shipment.margin' })
    expect(() => assertFaceParity(frame, [markdown!, rogue])).toThrow(FaceParityError)
  })

  it('fails when a face fills an absent value in — the classic invention', () => {
    const [markdown, data] = faces()
    const filled = (data?.emitted ?? []).map((e) =>
      e.path === 'shipment.temperature' ? { ...e, presence: 'present' as const, text: '0 [OBS epcis-spine]' } : e
    )
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: filled })
    const breaches = faceParity(frame, [markdown!, rogue])
    expect(breaches.map((b) => b.kind).sort()).toEqual(['presence', 'text', 'text'])
    expect(breaches.some((b) => b.path === 'shipment.temperature' && b.detail.includes('canonical glyph'))).toBe(true)
  })

  it('fails when a face renders a withheld value as merely absent', () => {
    const [markdown, data] = faces()
    const laundered = (data?.emitted ?? []).map((e) =>
      e.path === 'shipment.unitPrice' ? { ...e, presence: 'absent' as const, text: '— [OBS epcis-spine]' } : e
    )
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: laundered })
    const breaches = faceParity(frame, [markdown!, rogue])
    expect(breaches.some((b) => b.kind === 'presence' && b.path === 'shipment.unitPrice')).toBe(true)
  })

  it('fails when a face emits the same Field twice', () => {
    const [markdown, data] = faces()
    const doubled = [...(data?.emitted ?? []), data!.emitted[0]!]
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: doubled })
    expect(faceParity(frame, [markdown!, rogue]).some((b) => b.detail.includes('twice'))).toBe(true)
  })
})

describe('face parity catches a DROPPED value', () => {
  it('fails when a face never emits a Field the Frame holds', () => {
    const [markdown, data] = faces()
    const dropped = (data?.emitted ?? []).filter((e) => e.path !== 'lines[1].coverage')
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: dropped })
    const breaches = faceParity(frame, [markdown!, rogue])
    expect(breaches).toEqual([{ kind: 'missing', path: 'lines[1].coverage', detail: expect.stringContaining('never emitted this Field') }])
  })
})

describe('face parity catches a RE-FORMATTED value', () => {
  it('fails by default when a face rounds a number', () => {
    const [markdown, data] = faces()
    const rounded = (data?.emitted ?? []).map((e) => (e.path === 'lines[0].coverage' ? { ...e, text: '83% [CALC coverage-rollup]' } : e))
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: rounded })
    expect(faceParity(frame, [markdown!, rogue]).some((b) => b.kind === 'text')).toBe(true)
  })

  it('lets a face opt out of text equality and keeps the structural guarantees', () => {
    const [markdown, data] = faces()
    const rounded = (data?.emitted ?? []).map((e) => (e.path === 'lines[0].coverage' ? { ...e, text: '83% [CALC coverage-rollup]' } : e))
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: rounded })
    expect(faceParity(frame, [markdown!, rogue], { textMustMatch: false })).toEqual([])
  })
})

describe('face parity is what lets a designer move the markup', () => {
  it('passes when a face changes structure but not values', () => {
    const [markdown, data] = faces()
    const restructured = [...(data?.emitted ?? [])].reverse()
    const redesigned = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: restructured })
    expect(faceParity(frame, [markdown!, redesigned])).toEqual([])
  })
})
