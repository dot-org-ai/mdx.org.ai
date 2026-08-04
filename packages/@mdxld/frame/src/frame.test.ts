import { describe, it, expect } from 'vitest'
import { makeFrame, framePaths, walkFrame } from './frame.js'
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
    expect(() => makeFrame({ view: 'v', snapshot: { token: '', asOf }, roles: [] })).toThrow(/snapshot token/)
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
