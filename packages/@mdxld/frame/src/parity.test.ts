import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderData, declareRendering, type EmittedValue } from './render.js'
import { assertFaceParity, faceParity } from './parity.js'
import { FaceParityError } from './errors.js'
import { makeFrame } from './frame.js'
import { present } from './field.js'
import { fixtureFrame, fixtureRegistry } from './fixtures.js'

const registry = fixtureRegistry()
const frame = fixtureFrame()

function faces() {
  return [renderMarkdown(frame, { registry }), renderData(frame, { registry })]
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

  it('lets a face opt out of BOTH text concessions explicitly, and keeps the structural guarantees', () => {
    const [markdown, data] = faces()
    const rounded = (data?.emitted ?? []).map((e) => (e.path === 'lines[0].coverage' ? { ...e, text: '83% [CALC coverage-rollup]' } : e))
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: rounded })
    expect(faceParity(frame, [markdown!, rogue], { textMustMatch: false, facesMustAgree: false })).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The two text concessions are separate
// ─────────────────────────────────────────────────────────────────────────────

describe('textMustMatch and facesMustAgree are two different concessions', () => {
  const replaced = (): EmittedValue[] => {
    const [, data] = faces()
    return (data?.emitted ?? []).map((e) => ({ ...e, text: 'DELIVERED' }))
  }

  it('used to let every value in a face be replaced with "DELIVERED" and still pass', () => {
    const [markdown] = faces()
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: replaced() })
    // Turning off cross-face agreement no longer turns off the check against the record.
    const breaches = faceParity(frame, [markdown!, rogue], { facesMustAgree: false })
    expect(breaches.length).toBeGreaterThan(0)
    expect(breaches.every((b) => b.kind === 'text')).toBe(true)
    expect(breaches.some((b) => b.detail.includes('canonical glyph'))).toBe(true)
  })

  it('keeps cross-face disagreement visible when only the face-vs-Frame check is waived', () => {
    const [markdown] = faces()
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: replaced() })
    const breaches = faceParity(frame, [markdown!, rogue], { textMustMatch: false })
    expect(breaches.length).toBeGreaterThan(0)
    expect(breaches.every((b) => b.kind === 'text' && b.detail.includes('emitted'))).toBe(true)
  })

  it('still checks presence and attribution under both concessions', () => {
    const [markdown, data] = faces()
    const laundered = (data?.emitted ?? []).map((e) => (e.path === 'shipment.unitPrice' ? { ...e, presence: 'absent' as const } : e))
    const rogue = declareRendering({ view: frame.view, format: 'react', snapshot: frame.snapshot, emitted: laundered })
    expect(faceParity(frame, [markdown!, rogue], { textMustMatch: false, facesMustAgree: false }).some((b) => b.kind === 'presence')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Parity checks the Rendering is of THIS Frame
// ─────────────────────────────────────────────────────────────────────────────

describe('face parity checks the Rendering is of this Frame', () => {
  it('fails when a face is a Rendering of a different snapshot', () => {
    const [markdown] = faces()
    const stale = declareRendering({
      view: frame.view,
      format: 'react',
      snapshot: { token: 'evt:earlier', asOf: frame.snapshot.asOf },
      emitted: markdown!.emitted,
    })
    const breaches = faceParity(frame, [markdown!, stale])
    expect(breaches.some((b) => b.kind === 'snapshot' && b.detail.includes('evt:earlier'))).toBe(true)
  })

  it('fails when a face is a Rendering of a different moment of the same snapshot token', () => {
    const [markdown] = faces()
    const stale = declareRendering({
      view: frame.view,
      format: 'react',
      snapshot: { token: frame.snapshot.token, asOf: { instant: '2026-08-03T12:00:00Z' } },
      emitted: markdown!.emitted,
    })
    expect(faceParity(frame, [markdown!, stale]).some((b) => b.kind === 'snapshot')).toBe(true)
  })

  it('fails when a face is a Rendering of a different View', () => {
    const [markdown] = faces()
    const other = declareRendering({ view: 'some-other-view', format: 'react', snapshot: frame.snapshot, emitted: markdown!.emitted })
    expect(faceParity(frame, [markdown!, other]).some((b) => b.kind === 'snapshot' && b.detail.includes('some-other-view'))).toBe(true)
  })

  it('used to pass: two faces of two different Frames', () => {
    const laterRegistry = fixtureRegistry()
    const later = makeFrame({
      view: 'shipment-detail',
      snapshot: { token: 'evt:later', asOf: { instant: '2026-08-05T12:00:00Z' } },
      roles: [
        {
          role: 'shipment',
          fields: {
            status: present('delivered', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
            eta: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
            temperature: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
            unitPrice: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
            receivedQty: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
          },
        },
        {
          role: 'lines',
          rows: [
            {
              gtin: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
              qty: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
              coverage: present('x', { attribution: 'OBS', watermark: { source: 'epcis-spine' }, asOf: { instant: '2026-08-05T12:00:00Z' } }),
            },
          ],
        },
      ],
    })
    const laterFace = renderMarkdown(later, { registry: laterRegistry })
    expect(faceParity(later, [laterFace])).toEqual([])
    // The same Rendering, checked against the EARLIER Frame, is now caught.
    expect(faceParity(frame, [laterFace]).some((b) => b.kind === 'snapshot')).toBe(true)
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
