/**
 * # The one value serializer
 *
 * Every face — markdown, JSON, React, a Slack block, anything — prints a Field's value through
 * {@link renderGlyph} and no other route. That is the whole mechanism behind "a Rendering never
 * invents or changes a value": a face is handed the finished glyph and chooses only where to put
 * it, so there is no seam at which a face could round a number, default a null, or promote an
 * unconfirmed value to a confirmed one.
 *
 * It also means the four presence states are distinguishable in EVERY face by construction:
 * `—` is absent, `withheld(<class>)` is licence-gated, `~` marks a value the server has not
 * acknowledged, and a bare value is a matter of record.
 *
 * @packageDocumentation
 */

import { hasValue, type Field } from './field.js'

/** What an absent value renders as, in every face. An explicit UNKNOWN, never a zero. */
export const ABSENT_GLYPH = '—'

/** The marker a value the server has not acknowledged carries. */
export const UNCONFIRMED_MARK = '~'

/**
 * A value's text. One place, so every face agrees. Strings pass through; numbers and booleans
 * are `String()`-ed with NO rounding (rounding is invention, and the place to format a number is
 * upstream, in the model, once); anything else is JSON.
 *
 * If a caller wants a locale date or a unit suffix, it belongs in the Field's `value` — computed
 * once where the Frame is assembled, not at each face.
 */
export function canonicalText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value === null || value === undefined) return ABSENT_GLYPH
  return JSON.stringify(value)
}

/**
 * The provenance mark: the class, its source, and — for a MODEL value — its receipt and
 * confidence. Every face renders the class; a model-inferred value is never presented with the
 * same weight as an observation.
 */
export function provenanceMark(field: Field<unknown>): string {
  if (field.attribution === 'MODEL') {
    const version = field.watermark.modelVersion
    const receipt = version === undefined ? field.watermark.source : `${field.watermark.source}@${version}`
    return field.confidence === undefined ? `[MODEL ${receipt}]` : `[MODEL ${receipt} conf=${field.confidence}]`
  }
  return `[${field.attribution} ${field.watermark.source}]`
}

/** A Field's value text, WITHOUT its provenance mark. */
export function valueText(field: Field<unknown>): string {
  switch (field.presence) {
    case 'present':
      return canonicalText(field.value)
    case 'unconfirmed':
      return `${canonicalText(field.value)} ${UNCONFIRMED_MARK}`
    case 'withheld':
      return `withheld(${field.licenceClass})`
    case 'absent':
      return field.reason === undefined ? ABSENT_GLYPH : `${ABSENT_GLYPH} (${field.reason})`
  }
}

/**
 * THE canonical serialization of a Field: its value text plus its provenance mark. This is the
 * string every face is held to by {@link assertFaceParity} — a face that prints something else
 * for a Field has changed a value, whatever it looks like on screen.
 */
export function renderGlyph(field: Field<unknown>): string {
  return `${valueText(field)} ${provenanceMark(field)}`
}

/** True when the Field carries a value the server has confirmed. */
export function isConfirmed(field: Field<unknown>): boolean {
  return field.presence === 'present'
}

/** Re-exported for faces that need the value itself (a React chip, a chart series). */
export { hasValue }
