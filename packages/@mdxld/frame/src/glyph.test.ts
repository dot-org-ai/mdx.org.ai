import { describe, it, expect } from 'vitest'
import { present, absent, withheld, unconfirmed } from './field.js'
import { canonicalText, valueText, renderGlyph, ABSENT_GLYPH, COLLIDES_WITH_A_PRESENCE_MARKER } from './glyph.js'

const asOf = { instant: '2026-08-04T12:00:00Z' } as const
const obs = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }

// ─────────────────────────────────────────────────────────────────────────────
// B6 — the four presence states are distinguishable in the markdown face
// ─────────────────────────────────────────────────────────────────────────────

describe('a present value can never imitate a presence marker', () => {
  it('distinguishes present("—") from absent()', () => {
    expect(valueText(absent(obs))).toBe(ABSENT_GLYPH)
    expect(valueText(present(ABSENT_GLYPH, obs))).toBe('"—"')
    expect(valueText(present(ABSENT_GLYPH, obs))).not.toBe(valueText(absent(obs)))
  })

  it('distinguishes present("— (no sensor)") from absent with that reason', () => {
    const a = valueText(absent({ ...obs, reason: 'no sensor' }))
    const p = valueText(present('— (no sensor)', obs))
    expect(a).toBe('— (no sensor)')
    expect(p).toBe('"— (no sensor)"')
    expect(p).not.toBe(a)
  })

  it('distinguishes present("withheld(commercial-terms)") from withheld("commercial-terms")', () => {
    const w = valueText(withheld('commercial-terms', obs))
    const p = valueText(present('withheld(commercial-terms)', obs))
    expect(w).toBe('withheld(commercial-terms)')
    expect(p).toBe('"withheld(commercial-terms)"')
    expect(p).not.toBe(w)
  })

  it('distinguishes present("12 ~") from unconfirmed(12)', () => {
    const u = valueText(unconfirmed(12, obs))
    const p = valueText(present('12 ~', obs))
    expect(u).toBe('12 ~')
    expect(p).toBe('"12 ~"')
    expect(p).not.toBe(u)
  })

  it('keeps the quoting itself unambiguous — an already-quoted value is quoted again', () => {
    expect(valueText(present('"—"', obs))).toBe('"\\"—\\""')
    expect(valueText(present('"already quoted"', obs))).toBe('"\\"already quoted\\""')
  })

  it('leaves an ordinary value entirely alone', () => {
    expect(valueText(present('shipped', obs))).toBe('shipped')
    expect(valueText(present(4.5, obs))).toBe('4.5')
    expect(valueText(present(0, obs))).toBe('0')
    expect(valueText(present(false, obs))).toBe('false')
  })

  it('names the collision rule as an exported predicate a consumer face can reuse', () => {
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('—')).toBe(true)
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('— (no sensor)')).toBe(true)
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('withheld(x)')).toBe(true)
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('12 ~')).toBe(true)
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('"quoted"')).toBe(true)
    expect(COLLIDES_WITH_A_PRESENCE_MARKER('shipped')).toBe(false)
  })

  it('makes every one of the four states recoverable from the text of a whole fixture set', () => {
    const fields = [present(ABSENT_GLYPH, obs), absent(obs), present('withheld(c)', obs), withheld('c', obs), present('12 ~', obs), unconfirmed(12, obs)]
    const texts = fields.map((f) => renderGlyph(f))
    expect(new Set(texts).size).toBe(texts.length)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B7 — a present null is a value, not an absence
// ─────────────────────────────────────────────────────────────────────────────

describe('present(null) is not promoted to UNKNOWN', () => {
  it('renders null as null, never as the absent glyph', () => {
    expect(canonicalText(null)).toBe('null')
    expect(valueText(present(null, obs))).toBe('null')
    expect(valueText(present(null, obs))).not.toBe(ABSENT_GLYPH)
  })

  it('keeps a present null distinct from an absent Field in the canonical glyph', () => {
    expect(renderGlyph(present(null, obs))).not.toBe(renderGlyph(absent(obs)))
  })

  it('keeps present(null) distinct from the STRING "null"', () => {
    expect(valueText(present(null, obs))).toBe('null')
    expect(valueText(present('null', obs))).toBe('"null"')
  })

  it('does the same for undefined', () => {
    expect(canonicalText(undefined)).toBe('undefined')
    expect(valueText(present(undefined, obs))).toBe('undefined')
    expect(valueText(present('undefined', obs))).toBe('"undefined"')
  })
})
