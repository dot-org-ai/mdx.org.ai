import { describe, it, expect } from 'vitest'
import {
  makeField,
  present,
  absent,
  withheld,
  unconfirmed,
  assertFieldHonest,
  isField,
  isHonestConfidence,
  modelConfidence,
  isBlank,
  type Field,
  type ModelConfidence,
} from './field.js'
import { FieldHonestyError } from './errors.js'

const asOf = { instant: '2026-08-04T12:00:00Z' } as const
const obs = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }
const model = { attribution: 'MODEL' as const, watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf, confidence: modelConfidence(0.62) }

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
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model' }, asOf, confidence: modelConfidence(0.62) })).toThrow(FieldHonestyError)
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model' }, asOf, confidence: modelConfidence(0.62) })).toThrow(
      /no modelVersion receipt/
    )
  })

  it('REFUSES a MODEL value with no confidence', () => {
    expect(() => present(4.5, { attribution: 'MODEL', watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf })).toThrow(/no confidence/)
  })

  it('REFUSES a MODEL value whose confidence is outside [0,1]', () => {
    for (const bad of [1.7, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => present(4.5, { ...model, confidence: bad as ModelConfidence })).toThrow(/out-of-range confidence/)
    }
  })

  it('accepts the closed bounds 0 and 1', () => {
    expect(present(4.5, { ...model, confidence: modelConfidence(0) }).confidence).toBe(0)
    expect(present(4.5, { ...model, confidence: modelConfidence(1) }).confidence).toBe(1)
  })

  it('REFUSES an OBS/CALC value that smuggles a model receipt in', () => {
    expect(() => present(4.5, { attribution: 'OBS', watermark: { source: 'x', modelVersion: '2.1.0' }, asOf })).toThrow(/smuggles a modelVersion receipt/)
    expect(() => present(4.5, { attribution: 'CALC', watermark: { source: 'x' }, asOf, confidence: modelConfidence(0.9) })).toThrow(/carries a confidence/)
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

// ─────────────────────────────────────────────────────────────────────────────
// B2/B3 — the presence-specific payload, at the JSON boundary
// ─────────────────────────────────────────────────────────────────────────────

describe('a presence state without its payload is not a Field', () => {
  it('REFUSES a present Field carrying no value at all — it used to render as an absence', () => {
    const wire = JSON.parse('{"presence":"present","attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}') as Field<number>
    expect(isField(wire)).toBe(false)
    expect(() => assertFieldHonest(wire, 'shipment.status')).toThrow(FieldHonestyError)
    expect(() => assertFieldHonest(wire, 'shipment.status')).toThrow(/the payload its presence state promises/)
  })

  it('REFUSES an unconfirmed Field carrying no value', () => {
    const wire = JSON.parse('{"presence":"unconfirmed","attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}') as Field<number>
    expect(isField(wire)).toBe(false)
  })

  it('REFUSES an absent Field that smuggles a value in', () => {
    const wire = JSON.parse('{"presence":"absent","value":42,"attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}') as Field<number>
    expect(isField(wire)).toBe(false)
    expect(() => assertFieldHonest(wire, 'shipment.temperature')).toThrow(FieldHonestyError)
  })

  it('REFUSES a withheld Field that smuggles a value in', () => {
    const wire = JSON.parse(
      '{"presence":"withheld","licenceClass":"commercial-terms","value":4.2,"attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}'
    ) as Field<number>
    expect(isField(wire)).toBe(false)
  })

  it('REFUSES a withheld Field with NO licenceClass as a FieldHonestyError, never a TypeError', () => {
    const wire = JSON.parse('{"presence":"withheld","attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}') as Field<never>
    expect(isField(wire)).toBe(false)
    // The bug: `.trim()` on undefined threw a TypeError, which no caller catching FieldHonestyError sees.
    let caught: unknown
    try {
      assertFieldHonest(wire, 'shipment.unitPrice')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(FieldHonestyError)
    expect(caught).not.toBeInstanceOf(TypeError)
  })

  it('REFUSES a non-string reason and a non-number confidence', () => {
    expect(isField(JSON.parse('{"presence":"absent","reason":7,"attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}'))).toBe(false)
    expect(isField(JSON.parse('{"presence":"present","value":1,"confidence":"high","attribution":"OBS","watermark":{"source":"s"},"asOf":{"seq":1}}'))).toBe(false)
  })

  it('still accepts a well-formed Field over the wire', () => {
    const wire = JSON.parse(
      '{"presence":"withheld","licenceClass":"commercial-terms","attribution":"OBS","watermark":{"source":"partner-feed"},"asOf":{"seq":1}}'
    ) as Field<never>
    expect(isField(wire)).toBe(true)
    expect(() => assertFieldHonest(wire, 'price')).not.toThrow()
  })
})

describe('makeField over a JSON boundary', () => {
  it('re-refuses a dishonest Field that never met a constructor', () => {
    const overTheWire = JSON.parse('{"presence":"present","value":4.5,"attribution":"MODEL","watermark":{"source":"eta-model"},"asOf":{"seq":1}}') as Field<number>
    expect(() => assertFieldHonest(overTheWire, 'eta')).toThrow(FieldHonestyError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B10 — confidence is branded
// ─────────────────────────────────────────────────────────────────────────────

describe('ModelConfidence is a different type from a parse-coverage ratio', () => {
  it('does not let a bare number reach a Field — checked by tsc, not at runtime', () => {
    // `@mdxld/extract`'s ExtractResult.confidence is matchedSlots / totalSlots: a parse-coverage
    // figure in [0,1] that is NOT a model's confidence in its output. It used to typecheck here.
    const extractResult = { confidence: 0.75 }
    // @ts-expect-error a parse-coverage number is not a ModelConfidence
    const smuggled: ModelConfidence = extractResult.confidence
    expect(smuggled).toBe(0.75)
  })

  it('is constructed only through modelConfidence, which enforces the range', () => {
    expect(modelConfidence(0.62)).toBe(0.62)
    for (const bad of [1.7, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => modelConfidence(bad)).toThrow(FieldHonestyError)
    }
  })

  it('normalises -0, which is a number the contract cannot mean', () => {
    expect(Object.is(modelConfidence(-0), 0)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B11 — a constructed Field is frozen
// ─────────────────────────────────────────────────────────────────────────────

describe('a constructed Field cannot be edited past the honesty guard', () => {
  it('refuses a rewritten attribution and a fabricated model version', () => {
    const f = present('shipped', obs) as { attribution: string; watermark: { modelVersion?: string } }
    expect(() => {
      f.attribution = 'MODEL'
    }).toThrow(TypeError)
    expect(() => {
      f.watermark.modelVersion = 'fabricated-9.9'
    }).toThrow(TypeError)
    expect(present('shipped', obs).attribution).toBe('OBS')
  })

  it('freezes all the way down, not just the top object', () => {
    const f = present('shipped', obs)
    expect(Object.isFrozen(f)).toBe(true)
    expect(Object.isFrozen(f.watermark)).toBe(true)
    expect(Object.isFrozen(f.asOf)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The nits with teeth
// ─────────────────────────────────────────────────────────────────────────────

describe('blankness, and the shapes that squeaked past it', () => {
  it('treats a zero-width space as blank — .trim() does not strip U+200B', () => {
    expect('\u200B'.trim()).not.toBe('')
    expect(isBlank('\u200B')).toBe(true)
    expect(() => present(1, { attribution: 'OBS', watermark: { source: '\u200B' }, asOf })).toThrow(/empty source watermark/)
    expect(() => withheld('\u200B\uFEFF', obs)).toThrow(/names the class that gates it/)
  })

  it('refuses a non-integer asOf seq — an ordinal is a count of steps, not a measurement', () => {
    expect(isField({ presence: 'present', value: 1, attribution: 'OBS', watermark: { source: 's' }, asOf: { seq: 1.5 } })).toBe(false)
    expect(isField({ presence: 'present', value: 1, attribution: 'OBS', watermark: { source: 's' }, asOf: { seq: 1 } })).toBe(true)
  })
})

describe('makeField spec form', () => {
  it('takes an explicit presence', () => {
    expect(makeField({ presence: 'unconfirmed', value: 12, ...obs }).presence).toBe('unconfirmed')
    expect(makeField({ value: 12, ...obs }).presence).toBe('present')
  })
})
