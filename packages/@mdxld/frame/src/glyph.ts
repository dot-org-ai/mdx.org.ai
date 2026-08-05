/**
 * # The one value serializer
 *
 * Every face — markdown, JSON, React, a Slack block, anything — prints a Field's value through
 * {@link renderGlyph} and no other route. That is the whole mechanism behind "a Rendering never
 * invents or changes a value": a face is handed the finished glyph and chooses only where to put
 * it, so there is no seam at which a face could round a number, default a null, or promote an
 * unconfirmed value to a confirmed one.
 *
 * ## The four presence states are recoverable from the text, and that is enforced
 * A value's text is not passed through raw. `—` means absent, `withheld(<class>)` means
 * licence-gated and a trailing ` ~` means unacknowledged — so a PRESENT value whose own text is
 * one of those forms would be indistinguishable from the state it imitates. `present('—')` and
 * `absent()` were byte-identical; so were `present('withheld(commercial-terms)')` and
 * `withheld('commercial-terms')`, and `present('12 ~')` and `unconfirmed(12)`. An agent parsing
 * the markdown face could not tell them apart, which makes the four-state design decorative in
 * exactly the face it exists for.
 *
 * {@link valueText} therefore QUOTES a value whose text would collide — JSON string quoting, so
 * the escape is itself unambiguous and reversible:
 *
 * | Field                                  | text                        |
 * |----------------------------------------|-----------------------------|
 * | `absent()`                             | `—`                         |
 * | `present('—')`                         | `"—"`                       |
 * | `withheld('commercial-terms')`         | `withheld(commercial-terms)`|
 * | `present('withheld(commercial-terms)')`| `"withheld(commercial-terms)"` |
 * | `unconfirmed(12)`                      | `12 ~`                      |
 * | `present('12 ~')`                      | `"12 ~"`                    |
 * | `present('"already quoted"')`          | `"\"already quoted\""`      |
 *
 * A reader recovers the presence state by testing, in order: a trailing ` ~` is unconfirmed; a
 * `withheld(...)` form is withheld; `—` or `— (reason)` is absent; anything else is present, and
 * an outer pair of quotes is stripped. {@link COLLIDES_WITH_A_PRESENCE_MARKER} is the predicate,
 * exported so a consumer's own face can be held to the same rule.
 *
 * @packageDocumentation
 */

import { hasValue, type Field } from './field.js'

/** What an absent value renders as, in every face. An explicit UNKNOWN, never a zero. */
export const ABSENT_GLYPH = '—'

/** The marker a value the server has not acknowledged carries. */
export const UNCONFIRMED_MARK = '~'

/**
 * True when a present value's own text would imitate one of the presence markers, and so must be
 * quoted before it is emitted. The clauses, in order: the bare absent glyph; the absent-with-reason
 * form; the withheld form; a trailing unconfirmed mark; a leading quote (which would otherwise
 * make the un-quoting step ambiguous); and the two literals {@link canonicalText} produces for a
 * `null`/`undefined` value.
 */
export const COLLIDES_WITH_A_PRESENCE_MARKER = (text: string): boolean =>
  text === ABSENT_GLYPH ||
  text.startsWith(`${ABSENT_GLYPH} (`) ||
  /^withheld\(.*\)$/s.test(text) ||
  text.endsWith(` ${UNCONFIRMED_MARK}`) ||
  text.startsWith('"') ||
  text === 'null' ||
  text === 'undefined'

/**
 * A value's text. One place, so every face agrees. Strings pass through; numbers and booleans
 * are `String()`-ed with NO rounding (rounding is invention, and the place to format a number is
 * upstream, in the model, once); anything else is JSON.
 *
 * A `null` renders `null` and an `undefined` renders `undefined` — NOT the absent glyph. A
 * present `null` is either a real value (a JSON null the record actually holds) or a modelling
 * error, and quietly promoting it to UNKNOWN is precisely the failure the four presence states
 * exist to eliminate: it makes "the record says null" and "we have no reading" the same bytes. If
 * a null means unknown, the Frame's author says so with {@link absent}, which is the constructor
 * that carries a reason.
 *
 * If a caller wants a locale date or a unit suffix, it belongs in the Field's `value` — computed
 * once where the Frame is assembled, not at each face.
 */
export function canonicalText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

/**
 * A present/unconfirmed value's text, quoted when it would imitate a presence marker. A real
 * `null`/`undefined` keeps its bare literal — it is not imitating anything — while the STRING
 * `'null'` is quoted, so the two stay distinguishable in both directions.
 */
function presentText(value: unknown): string {
  const text = canonicalText(value)
  if (value === null || value === undefined) return text
  return COLLIDES_WITH_A_PRESENCE_MARKER(text) ? JSON.stringify(text) : text
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
      return presentText(field.value)
    case 'unconfirmed':
      return `${presentText(field.value)} ${UNCONFIRMED_MARK}`
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
