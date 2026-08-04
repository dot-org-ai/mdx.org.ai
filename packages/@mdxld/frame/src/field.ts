/**
 * # Field — the atom of a Frame
 *
 * Every rendered value is a **Field**: its `value` plus the provenance it was derived under —
 * an {@link Attribution}, a {@link SourceWatermark}, an {@link AsOf}, and, for a model value, a
 * `confidence`. The Frame invents nothing, so a value that is genuinely unavailable is not a
 * zero and not a default: it is an explicit UNKNOWN.
 *
 * ## Four presence states, and why four
 * Kestrel's shipped Field has three provenance classes and one absence. This contract carries a
 * fourth and a fifth state that the trading model has no use for and a shared-record model
 * cannot do without:
 *
 * | presence      | means                                                            |
 * |---------------|------------------------------------------------------------------|
 * | `present`     | the Frame holds this value and the server has confirmed it        |
 * | `absent`      | genuinely unknown — renders `—`, never a guess and never a zero   |
 * | `withheld`    | the value EXISTS and this vantage may not see it — carries its licence class |
 * | `unconfirmed` | a local, optimistic value the server has not acknowledged         |
 *
 * `absent` and `withheld` are different facts and conflating them is a quiet lie about the
 * record: "we have no reading" and "there is a reading you are not licensed for" are answers a
 * trading partner acts on differently. `unconfirmed` exists because offline / store-and-forward
 * is deferred but NOT foreclosed — a client may hold values the server has not confirmed, and
 * the contract must be able to say so rather than promote them silently.
 *
 * ## Honesty is enforced at construction, not at render
 * A `MODEL` value must carry its receipt (a source watermark bearing a model version) and a
 * `confidence` in `[0,1]`; an `OBS`/`CALC` value must carry neither. A Field that mis-attributes
 * is REFUSED — {@link makeField} throws, and {@link assertFieldHonest} re-checks Fields that
 * arrived across a JSON boundary and so never met a constructor.
 *
 * ## asOf, and no staleness policy
 * Every Field carries an {@link AsOf} from day one. What a renderer should DO when a value is
 * old is **policy, and this package decides none of it** — there is no `maxAge`, no `isStale`,
 * no freshness glyph anywhere in this contract. Carrying the stamp is the whole commitment.
 *
 * @packageDocumentation
 */

import { FieldHonestyError } from './errors.js'

/**
 * How a value was derived — the provenance class, ported unchanged from kestrel.
 *
 * - `OBS` — observed: read from the record (a scan, a quote, a submitted document).
 * - `CALC` — a deterministic transform of observed values (a rate, a coverage percentage,
 *   an aggregate). Carries no receipt because it can be recomputed.
 * - `MODEL` — a generative or statistical output. MUST carry its receipt and its confidence:
 *   nothing above CALC goes unattributed.
 */
export type Attribution = 'OBS' | 'CALC' | 'MODEL'

/** The four presence states. See the module note for why `absent` and `withheld` are two. */
export type Presence = 'present' | 'absent' | 'withheld' | 'unconfirmed'

/**
 * WHEN a value was derived. Two shapes, because two honest clocks exist and neither is
 * universal: `seq` is a monotonic ordinal (kestrel's replay-stability key — date-blind, so the
 * same bus replays to byte-identical Fields); `instant` is an ISO-8601 timestamp (a supply-chain
 * record's event time is a real moment and pretending otherwise loses the fact).
 *
 * This package reads `asOf` only to carry and serialize it. It draws NO conclusion from it.
 */
export type AsOf = { readonly seq: number } | { readonly instant: string }

/**
 * WHERE a value came from. `source` is required on every Field — a value with no stated origin
 * is unattributable, whatever its class. `modelVersion` is the receipt an honest `MODEL` claim
 * rests on: required for a `MODEL` value, forbidden on `OBS`/`CALC`.
 */
export interface SourceWatermark {
  /** The system, feed, verb or document the value came from. Non-empty. */
  readonly source: string
  /** The model version behind a `MODEL` value. Required for `MODEL`; forbidden for `OBS`/`CALC`. */
  readonly modelVersion?: string
}

/** The provenance every Field carries, whatever its presence state. */
interface FieldProvenance {
  readonly attribution: Attribution
  readonly watermark: SourceWatermark
  readonly asOf: AsOf
  /** Model confidence in `[0,1]`. Required for a `MODEL` value; forbidden otherwise. */
  readonly confidence?: number
}

/** A value the Frame holds and the server has confirmed. */
export interface PresentField<T> extends FieldProvenance {
  readonly presence: 'present'
  readonly value: T
}

/**
 * A local, optimistic value the server has not acknowledged. Carries a value, and carries the
 * fact that it is not yet a matter of record.
 */
export interface UnconfirmedField<T> extends FieldProvenance {
  readonly presence: 'unconfirmed'
  readonly value: T
}

/** Genuinely unknown. Renders `—`. May carry a typed reason; never carries a value. */
export interface AbsentField extends FieldProvenance {
  readonly presence: 'absent'
  /** Absent-with-reason is data and renders as such. Absence without one renders as absence. */
  readonly reason?: string
}

/**
 * The value exists and this vantage may not see it. Carries the licence class that gates it —
 * naming the class is the difference between an honest refusal and a silent hole.
 */
export interface WithheldField extends FieldProvenance {
  readonly presence: 'withheld'
  /** The licence class gating the value, e.g. `commercial-terms`. Non-empty. */
  readonly licenceClass: string
}

/**
 * The one value type. A discriminated union on {@link Presence}, so the type system will not
 * let a caller read `.value` off a Field that has none.
 */
export type Field<T = unknown> = PresentField<T> | UnconfirmedField<T> | AbsentField | WithheldField

/** True when the Field carries a value (`present` or `unconfirmed`). */
export function hasValue<T>(field: Field<T>): field is PresentField<T> | UnconfirmedField<T> {
  return field.presence === 'present' || field.presence === 'unconfirmed'
}

/** The `[0,1]` range contract, as an executable predicate. NaN and ±Infinity fail both comparisons. */
export function isHonestConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1
}

const PRESENCES: readonly Presence[] = ['present', 'absent', 'withheld', 'unconfirmed']
const ATTRIBUTIONS: readonly Attribution[] = ['OBS', 'CALC', 'MODEL']

function isAsOf(v: unknown): v is AsOf {
  if (typeof v !== 'object' || v === null) return false
  const o = v as { seq?: unknown; instant?: unknown }
  if (typeof o.seq === 'number') return Number.isFinite(o.seq)
  return typeof o.instant === 'string' && o.instant !== ''
}

/**
 * Structural check that an unknown value has the SHAPE of a Field. Says nothing about honesty —
 * {@link assertFieldHonest} does that.
 */
export function isField(v: unknown): v is Field<unknown> {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Partial<Field<unknown>> & { watermark?: { source?: unknown } }
  if (!PRESENCES.includes(o.presence as Presence)) return false
  if (!ATTRIBUTIONS.includes(o.attribution as Attribution)) return false
  if (typeof o.watermark !== 'object' || o.watermark === null || typeof o.watermark.source !== 'string') return false
  return isAsOf(o.asOf)
}

/**
 * The honesty guard, as a validator. Refuses — by throwing a {@link FieldHonestyError} — every
 * Field whose provenance would misrepresent it:
 *
 * 1. no `source` watermark, or no `asOf`;
 * 2. a `MODEL` value (present or unconfirmed) missing its `modelVersion` receipt or its
 *    `confidence`, or carrying a `confidence` outside `[0,1]`;
 * 3. an `OBS`/`CALC` Field smuggling a `modelVersion` receipt or a `confidence` in — a
 *    mis-attribution that would let a model output render with the weight of an observation;
 * 4. a `confidence` on a Field with NO value (`absent`/`withheld`) — there is nothing to be
 *    confident about;
 * 5. a `withheld` Field with no licence class — an unnamed refusal is indistinguishable from
 *    a hole in the record.
 *
 * Call it on any Field that did not come from {@link makeField} — notably one parsed from JSON.
 * {@link makeFrame} calls it on every leaf.
 */
export function assertFieldHonest(field: Field<unknown>, where = 'Field'): void {
  if (!isField(field)) {
    throw new FieldHonestyError(`${where} is not a Field (needs presence, attribution, watermark.source and asOf)`)
  }
  if (field.watermark.source.trim() === '') {
    throw new FieldHonestyError(`${where} carries an empty source watermark — every value names where it came from`)
  }

  const carriesValue = hasValue(field)

  if (field.attribution === 'MODEL') {
    const version = field.watermark.modelVersion
    if (carriesValue) {
      if (version === undefined || version.trim() === '') {
        throw new FieldHonestyError(`${where} is a MODEL value with no modelVersion receipt — a MODEL value MUST carry source + modelVersion + confidence`)
      }
      if (field.confidence === undefined) {
        throw new FieldHonestyError(`${where} is a MODEL value with no confidence — a MODEL value MUST carry source + modelVersion + confidence`)
      }
      if (!isHonestConfidence(field.confidence)) {
        throw new FieldHonestyError(`${where} is a MODEL value with an out-of-range confidence ${field.confidence} — MODEL confidence MUST be in [0,1]`)
      }
    } else if (field.confidence !== undefined) {
      throw new FieldHonestyError(`${where} is ${field.presence} and carries a confidence — there is no value to be confident about`)
    }
  } else {
    if (field.watermark.modelVersion !== undefined) {
      throw new FieldHonestyError(`${where} is attributed ${field.attribution} and smuggles a modelVersion receipt — only a MODEL value carries one`)
    }
    if (field.confidence !== undefined) {
      throw new FieldHonestyError(`${where} is attributed ${field.attribution} and carries a confidence — only a MODEL value carries one`)
    }
  }

  if (field.presence === 'withheld' && field.licenceClass.trim() === '') {
    throw new FieldHonestyError(`${where} is withheld with no licence class — a withheld value names the class that gates it`)
  }
}

/** The construction spec {@link makeField} takes. `presence` defaults to `present`. */
export type FieldSpec<T> =
  | {
      readonly presence?: 'present' | 'unconfirmed'
      readonly value: T
      readonly attribution: Attribution
      readonly watermark: SourceWatermark
      readonly asOf: AsOf
      readonly confidence?: number
    }
  | { readonly presence: 'absent'; readonly attribution: Attribution; readonly watermark: SourceWatermark; readonly asOf: AsOf; readonly reason?: string }
  | {
      readonly presence: 'withheld'
      readonly attribution: Attribution
      readonly watermark: SourceWatermark
      readonly asOf: AsOf
      readonly licenceClass: string
    }

/**
 * Construct a Field, REFUSING a dishonest one at construct time. Never returns a Field that
 * violates {@link assertFieldHonest}.
 */
export function makeField<T>(spec: FieldSpec<T>): Field<T> {
  const presence: Presence = spec.presence ?? 'present'
  const watermark: SourceWatermark =
    spec.watermark.modelVersion === undefined ? { source: spec.watermark.source } : { source: spec.watermark.source, modelVersion: spec.watermark.modelVersion }

  let field: Field<T>
  if (presence === 'absent') {
    const s = spec as Extract<FieldSpec<T>, { presence: 'absent' }>
    field =
      s.reason === undefined
        ? { presence: 'absent', attribution: s.attribution, watermark, asOf: s.asOf }
        : { presence: 'absent', attribution: s.attribution, watermark, asOf: s.asOf, reason: s.reason }
  } else if (presence === 'withheld') {
    const s = spec as Extract<FieldSpec<T>, { presence: 'withheld' }>
    field = { presence: 'withheld', attribution: s.attribution, watermark, asOf: s.asOf, licenceClass: s.licenceClass }
  } else {
    const s = spec as Extract<FieldSpec<T>, { presence?: 'present' | 'unconfirmed' }>
    const base = { presence: presence as 'present' | 'unconfirmed', value: s.value, attribution: s.attribution, watermark, asOf: s.asOf }
    field = s.confidence === undefined ? base : { ...base, confidence: s.confidence }
  }

  assertFieldHonest(field)
  return field
}

/** Narrow constructor: a confirmed value. */
export function present<T>(value: T, provenance: { attribution: Attribution; watermark: SourceWatermark; asOf: AsOf; confidence?: number }): Field<T> {
  return makeField<T>({ ...provenance, presence: 'present', value })
}

/** Narrow constructor: a local optimistic value the server has not acknowledged. */
export function unconfirmed<T>(value: T, provenance: { attribution: Attribution; watermark: SourceWatermark; asOf: AsOf; confidence?: number }): Field<T> {
  return makeField<T>({ ...provenance, presence: 'unconfirmed', value })
}

/** Narrow constructor: genuinely unknown. Optionally with a typed reason. */
export function absent<T = never>(provenance: { attribution: Attribution; watermark: SourceWatermark; asOf: AsOf; reason?: string }): Field<T> {
  return makeField<T>({ ...provenance, presence: 'absent' })
}

/** Narrow constructor: the value exists and this vantage may not see it. */
export function withheld<T = never>(licenceClass: string, provenance: { attribution: Attribution; watermark: SourceWatermark; asOf: AsOf }): Field<T> {
  return makeField<T>({ ...provenance, presence: 'withheld', licenceClass })
}
