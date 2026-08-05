import { describe, it, expect } from 'vitest'
import { makeFrame, framePaths, walkFrame, STATE_KEY, type Frame } from './frame.js'
import { present, absent, type Field } from './field.js'
import { FrameError, FieldHonestyError } from './errors.js'
import { fixtureFrame } from './fixtures.js'

const asOf = { instant: '2026-08-04T12:00:00Z' } as const
const obs = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }
const snapshot = { token: 'evt:1', asOf }

describe('makeFrame', () => {
  it('gives every Field a canonical path, scalars then rows', () => {
    expect(framePaths(fixtureFrame())).toEqual([
      'shipment.status',
      'shipment.eta',
      'shipment.temperature',
      'shipment.unitPrice',
      'shipment.receivedQty',
      'lines[0].gtin',
      'lines[0].qty',
      'lines[0].coverage',
      'lines[1].gtin',
      'lines[1].qty',
      'lines[1].coverage',
    ])
  })

  it('carries the snapshot token that names the moment', () => {
    expect(fixtureFrame().snapshot.token).toBe('evt:0f3a91')
  })

  it('refuses a Frame with no snapshot token', () => {
    expect(() => makeFrame({ view: 'v', snapshot: { token: '', asOf }, roles: [{ role: 'a', fields: { x: present(1, obs) } }] })).toThrow(/snapshot token/)
  })

  it('refuses a duplicate Role id', () => {
    expect(() =>
      makeFrame({
        view: 'v',
        snapshot,
        roles: [
          { role: 'a', fields: { x: present(1, obs) } },
          { role: 'a', fields: { y: present(2, obs) } },
        ],
      })
    ).toThrow(FrameError)
  })

  it('refuses a naked value as a leaf — every leaf of a Frame is a Field', () => {
    const naked = { view: 'v', snapshot, roles: [{ role: 'a', fields: { x: 42 as unknown as Field<number> } }] }
    expect(() => makeFrame(naked)).toThrow(/is not a Field/)
  })

  it('re-runs the honesty guard on Fields that arrived across a JSON boundary', () => {
    const wire = JSON.parse(
      JSON.stringify({
        view: 'v',
        snapshot,
        roles: [{ role: 'a', rows: [{ eta: { presence: 'present', value: 4.5, attribution: 'MODEL', watermark: { source: 'eta-model' }, asOf } }] }],
      })
    ) as Parameters<typeof makeFrame>[0]
    expect(() => makeFrame(wire)).toThrow(FieldHonestyError)
    expect(() => makeFrame(wire)).toThrow(/a\[0\]\.eta/)
  })
})

describe('walkFrame', () => {
  it('is the one traversal — role, key, row index on every Field', () => {
    const walked = walkFrame(fixtureFrame())
    expect(walked).toHaveLength(11)
    expect(walked[0]).toMatchObject({ role: 'shipment', key: 'status' })
    expect(walked[10]).toMatchObject({ role: 'lines', key: 'coverage', row: 1 })
  })

  it('holds an absent Field, not a hole', () => {
    const frame = makeFrame({ view: 'v', snapshot, roles: [{ role: 'a', fields: { x: absent({ ...obs, reason: 'never scanned' }) } }] })
    const walked = walkFrame(frame)
    expect(walked).toHaveLength(1)
    expect(walked[0]?.field.presence).toBe('absent')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Paths are injective
// ─────────────────────────────────────────────────────────────────────────────

describe('a Field path addresses exactly one Field', () => {
  it('refuses the role/key split that makes two Fields share one address', () => {
    // role `x` + key `y.z` and role `x.y` + key `z` both address `x.y.z`.
    expect(() => makeFrame({ view: 'v', snapshot, roles: [{ role: 'x', fields: { 'y.z': present(1, obs) } }] })).toThrow(/make two different Fields share one address/)
    expect(() => makeFrame({ view: 'v', snapshot, roles: [{ role: 'x.y', fields: { z: present(1, obs) } }] })).toThrow(/one of \. \[ \]/)
  })

  it('refuses a Role id that imitates a row cell — `lines[0]` vs row 0 of `lines`', () => {
    expect(() => makeFrame({ view: 'v', snapshot, roles: [{ role: 'lines[0]', fields: { gtin: present('x', obs) } }] })).toThrow(FrameError)
  })

  it('demonstrates why: without the guard both spellings produce the identical path', () => {
    // The guard is what stops these two Frames from being indistinguishable by address.
    expect(['x', 'y.z'].join('.')).toBe(['x.y', 'z'].join('.'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// An empty Frame makes parity vacuous
// ─────────────────────────────────────────────────────────────────────────────

describe('a Frame with no Fields is refused', () => {
  it('refuses zero Roles', () => {
    expect(() => makeFrame({ view: 'v', snapshot, roles: [] })).toThrow(/carries no Fields/)
  })

  it('refuses Roles that are all empty', () => {
    expect(() => makeFrame({ view: 'v', snapshot, roles: [{ role: 'a', fields: {} }, { role: 'b', rows: [] }] })).toThrow(/carries no Fields/)
  })

  it('says why: parity over zero paths passes without checking anything', () => {
    expect(() => makeFrame({ view: 'v', snapshot, roles: [] })).toThrow(/passes without checking anything/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Role state — EMPTY, BLOCKED and LOADING do not collapse
// ─────────────────────────────────────────────────────────────────────────────

describe('a Role carries its own state as data', () => {
  const withState = (kind: 'ok' | 'empty' | 'blocked' | 'loading', sentence?: Field<string>): Frame =>
    makeFrame({ view: 'v', snapshot, roles: [{ role: 'queue', rows: [], state: sentence === undefined ? { kind } : { kind, sentence } }, { role: 'a', fields: { x: present(1, obs) } }] })

  it('keeps empty, blocked and loading distinct at the pane grain', () => {
    expect(withState('empty').roles[0]?.state?.kind).toBe('empty')
    expect(withState('blocked').roles[0]?.state?.kind).toBe('blocked')
    expect(withState('loading').roles[0]?.state?.kind).toBe('loading')
  })

  it('walks the state sentence as a Field, so face parity holds every face to it', () => {
    const frame = withState('blocked', present('the partner feed refused this vantage', obs))
    expect(framePaths(frame)).toContain(`queue.${STATE_KEY}`)
    expect(walkFrame(frame)[0]?.field.presence).toBe('present')
  })

  it('refuses a state sentence that is not a Field, and an unknown state kind', () => {
    expect(() =>
      makeFrame({ view: 'v', snapshot, roles: [{ role: 'q', rows: [], state: { kind: 'blocked', sentence: 'just a string' as unknown as Field<string> } }] })
    ).toThrow(/is not a Field/)
    expect(() =>
      makeFrame({ view: 'v', snapshot, roles: [{ role: 'q', rows: [], state: { kind: 'stalled' as 'ok' }, fields: { x: present(1, obs) } }] })
    ).toThrow(/declares state kind/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A Frame is frozen
// ─────────────────────────────────────────────────────────────────────────────

describe('an assembled Frame cannot be edited afterwards', () => {
  it('refuses a rewritten Field and a rewritten snapshot', () => {
    const frame = fixtureFrame() as unknown as { snapshot: { token: string }; roles: { fields: Record<string, unknown> }[] }
    expect(() => {
      frame.snapshot.token = 'evt:forged'
    }).toThrow(TypeError)
    expect(() => {
      frame.roles[0]!.fields.status = present('DELIVERED', obs)
    }).toThrow(TypeError)
  })

  it('does not hand back the caller’s own object for the caller to keep editing', () => {
    const roles: { role: string; fields: Record<string, Field<unknown>> }[] = [{ role: 'a', fields: { x: present(1, obs) } }]
    const frame = makeFrame({ view: 'v', snapshot, roles })
    roles.push({ role: 'b', fields: { y: present(2, obs) } })
    expect(frame.roles).toHaveLength(1)
  })
})
