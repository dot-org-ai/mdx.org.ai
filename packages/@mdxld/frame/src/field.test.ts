import { describe, it, expect } from 'vitest'
import { makeField, present, absent, withheld, unconfirmed, assertFieldHonest, isField, isHonestConfidence, type Field } from './field.js'
import { FieldHonestyError } from './errors.js'

const asOf = { instant: '2026-08-04T12:00:00Z' } as const
const obs = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }
const model = { attribution: 'MODEL' as const, watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf, confidence: 0.62 }

describe('makeField — the construct-time honesty guards', () => {
  it('constructs an honest OBS value', () => {
    const f = present('shipped', obs)
    expect(f.presence).toBe('present')
    expect(f.attribution).toBe('OBS')
    expect(f.watermark.source).toBe('epcis-spine')
    expect(f.asOf).toEqual(asOf)
  })

  it('constructs an honest MODEL value with its full receipt', () => {
    const f = present(4.5, model)
    expect(f.attribution).toBe('MODEL')
    expect(f.confidence).toBe(0.62)
    expect(f.watermark.modelVersion).toBe('2.1.0')
  })

  it('REFUSES a MODEL value with no modelVersion receipt', () => {
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model' }, asOf, confidence: 0.62 })).toThrow(FieldHonestyError)
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model' }, asOf, confidence: 0.62 })).toThrow(/no modelVersion receipt/)
  })

  it('REFUSES a MODEL value with no confidence', () => {
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf })).toThrow(/no confidence/)
  })

  it('REFUSES a MODEL value whose confidence is outside [0,1]', () => {
    for (const bad of [1.7, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => present(4.5, { ...model, confidence: bad })).toThrow(/out-of-range confidence/)
    }
  })

  it('accepts the closed bounds 0 and 1', () => {
    expect(present(4.5, { ...model, confidence: 0 }).confidence).toBe(0)
    expect(present(4.5, { ...model, confidence: 1 }).confidence).toBe(1)
  })

  it('REFUSES an OBS/CALC value that smuggles a model receipt in', () => {
    expect(() => present(4.5, { attribution: 'OBS', watermark: { source: 'x', modelVersion: '2.1.0' }, asOf })).toThrow(/smuggles a modelVersion receipt/)
    expect(() => present(4.5, { attribution: 'CALC', watermark: { source: 'x' }, asOf, confidence: 0.9 })).toThrow(/carries a confidence/)
  })

  it('REFUSES a value with no source watermark', () => {
    expect(() => present(4.5, { attribution: 'OBS', watermark: { source: '  ' }, asOf })).toThrow(/empty source watermark/)
  })

  it('REFUSES a withheld value with no licence class', () => {
    expect(() => withheld('   ', obs)).toThrow(/names the class that gates it/)
  })

  it('REFUSES a confidence on a value that does not exist', () => {
    const dishonest = {
      presence: 'absent',
      attribution: 'MODEL',
      watermark: { source: 'eta-model', modelVersion: '2.1.0' },
      asOf,
      confidence: 0.9,
    } as unknown as Field<number>
    expect(() => assertFieldHonest(dishonest, 'eta')).toThrow(/no value to be confident about/)
  })
})

describe('the four presence states', () => {
  it('distinguishes present, absent, withheld and unconfirmed', () => {
    expect(present('shipped', obs).presence).toBe('present')
    expect(absent(obs).presence).toBe('absent')
    expect(withheld('commercial-terms', obs).presence).toBe('withheld')
    expect(unconfirmed('shipped', obs).presence).toBe('unconfirmed')
  })

  it('carries the licence class on a withheld value', () => {
    const f = withheld('commercial-terms', obs)
    expect(f.presence === 'withheld' && f.licenceClass).toBe('commercial-terms')
  })

  it('carries an optional typed reason on an absent value', () => {
    const f = absent({ ...obs, reason: 'no scan recorded' })
    expect(f.presence === 'absent' && f.reason).toBe('no scan recorded')
    expect(absent(obs).presence === 'absent' && (absent(obs) as { reason?: string }).reason).toBeUndefined()
  })

  it('carries asOf on every state', () => {
    for (const f of [present(1, obs), absent(obs), withheld('c', obs), unconfirmed(1, obs)]) {
      expect(f.asOf).toEqual(asOf)
    }
  })

  it('accepts an ordinal asOf as well as an instant', () => {
    const f = present(1, { ...obs, asOf: { seq: 42 } })
    expect(f.asOf).toEqual({ seq: 42 })
  })
})

describe('isField / isHonestConfidence', () => {
  it('rejects a naked value as a Field', () => {
    expect(isField(4.5)).toBe(false)
    expect(isField(null)).toBe(false)
    expect(isField({ value: 4.5 })).toBe(false)
    expect(isField(present(4.5, obs))).toBe(true)
  })

  it('closes the confidence bounds and rejects NaN', () => {
    expect(isHonestConfidence(0)).toBe(true)
    expect(isHonestConfidence(1)).toBe(true)
    expect(isHonestConfidence(1.0001)).toBe(false)
    expect(isHonestConfidence(Number.NaN)).toBe(false)
  })
})

describe('makeField over a JSON boundary', () => {
  it('re-refuses a dishonest Field that never met a constructor', () => {
    const overTheWire = JSON.parse(
      '{"presence":"present","value":4.5,"attribution":"MODEL","watermark":{"source":"eta-model"},"asOf":{"seq":1}}'
    ) as Field<number>
    expect(() => assertFieldHonest(overTheWire, 'eta')).toThrow(FieldHonestyError)
  })

  it('accepts an honest Field that never met a constructor', () => {
    const overTheWire = JSON.parse(
      '{"presence":"withheld","licenceClass":"commercial-terms","attribution":"OBS","watermark":{"source":"partner-feed"},"asOf":{"seq":1}}'
    ) as Field<never>
    expect(() => assertFieldHonest(overTheWire, 'price')).not.toThrow()
  })
})

describe('makeField spec form', () => {
  it('takes an explicit presence', () => {
    expect(makeField({ presence: 'unconfirmed', value: 12, ...obs }).presence).toBe('unconfirmed')
    expect(makeField({ value: 12, ...obs }).presence).toBe('present')
  })
})
