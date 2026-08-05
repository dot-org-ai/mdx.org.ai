/**
 * # Field — the atom of a Frame
 *
 * Every rendered value is a **Field**: its `value` plus the provenance it was derived under —
 * an {@link Attribution}, a {@link SourceWatermark}, an {@link AsOf}, and, for a model value, a
 * `confidence`. The Frame invents nothing, so a value that is genuinely unavailable is not a
 * zero and not a default: it is an explicit UNKNOWN.
 *
 * ## Four presence states, and why four
 * Kestrel's shipped `Field` (`src/frame/types.ts`) has three provenance classes — `OBS`, `CALC`,
 * `MODEL` — and **no absence state at all**: its `value: T` is REQUIRED, and an unavailable value
 * is modelled OUTSIDE the Field, as a `null` input the renderer prints as `—`, or as one of the
 * four cell states in `PaneRefusal` (`src/frame/refusals.ts`: LATENT and DEFECTIVE cells, each
 * naming the train or the written reason behind it). What this contract ports is the provenance
 * ladder and the construct-time refusal; what it ADDS is folding absence INTO the value type, in
 * four states:
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
 * ## Confidence is branded, because two different numbers are called confidence
 * A Field's `confidence` is a MODEL confidence — how much the model believes its own output. A
 * parse-coverage figure (`matchedSlots / totalSlots`, as `@mdxld/extract`'s `ExtractResult` carries)
 * is a different quantity that happens to live in `[0,1]`, and assigning one to the other
 * typechecked before {@link ModelConfidence} existed. It is a branded number now: the only way to
 * make one is {@link modelConfidence}, which is where the range contract is enforced.
 *
 * ## A constructed Field is frozen — with three named exceptions
 * {@link makeField} deep-freezes what it returns. A Field whose `attribution` or `watermark` can
 * be rewritten after the honesty guard ran is not guarded at all — the guard would be a checkpoint
 * a caller walks past. The freeze covers the provenance completely; it does NOT cover a `value`
 * that is a typed array, a `Date`, a `Map` or a `Set`, and it freezes the caller's object rather
 * than a copy. All three limits are spelled out on {@link deepFreeze}, and none of them is
 * papered over: an unfreezable built-in reports `Object.isFrozen === false`, truthfully.
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

declare const MODEL_CONFIDENCE: unique symbol

/**
 * A MODEL's confidence in its own output, in `[0,1]`. A **branded** number: a bare `number` does
 * not satisfy it, so a parse-coverage ratio, a match score or a percentage cannot be assigned to a
 * Field's `confidence` by accident. {@link modelConfidence} is the only constructor.
 */
export type ModelConfidence = number & { readonly [MODEL_CONFIDENCE]: 'model' }

/** The provenance every Field carries, whatever its presence state. */
interface FieldProvenance {
  readonly attribution: Attribution
  readonly watermark: SourceWatermark
  readonly asOf: AsOf
  /** Model confidence in `[0,1]`. Required for a `MODEL` value; forbidden otherwise. */
  readonly confidence?: ModelConfidence
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

/**
 * The one constructor for a {@link ModelConfidence}. Refuses anything outside `[0,1]` — including
 * `NaN` and `±Infinity`, which fail both comparisons — and normalises `-0` to `0`, because `-0` is
 * a number the contract cannot mean and it prints as `0` anyway.
 */
export function modelConfidence(value: number): ModelConfidence {
  if (!isHonestConfidence(value)) {
    throw new FieldHonestyError(`confidence ${value} is outside [0,1] — a MODEL confidence is a probability, not a score`)
  }
  return (Object.is(value, -0) ? 0 : value) as ModelConfidence
}

/**
 * Blank by the contract's reckoning: whitespace, or a string of invisibles. `''.trim()` does not
 * strip U+200B, so a source watermark of one zero-width space passed the emptiness guard and
 * rendered as `[OBS ]` — an attribution to nowhere, wearing the shape of an attribution.
 */
const INVISIBLE_ONLY = /^[\s\u00A0\u1680\u180E\u2000-\u200F\u202F\u205F\u2060\u3000\uFEFF]*$/u

export function isBlank(text: string): boolean {
  return INVISIBLE_ONLY.test(text)
}

const PRESENCES: readonly Presence[] = ['present', 'absent', 'withheld', 'unconfirmed']
const ATTRIBUTIONS: readonly Attribution[] = ['OBS', 'CALC', 'MODEL']

function isAsOf(v: unknown): v is AsOf {
  if (typeof v !== 'object' || v === null) return false
  const o = v as { seq?: unknown; instant?: unknown }
  if ('seq' in o) return typeof o.seq === 'number' && Number.isInteger(o.seq)
  return typeof o.instant === 'string' && !isBlank(o.instant)
}

/**
 * Structural check that an unknown value has the SHAPE of a Field — including the payload its
 * presence state requires, which is the half that used to be missing. `presence` is a
 * discriminant, so a Field is only shaped like a Field if it carries what that discriminant
 * promises:
 *
 * | presence                 | MUST carry     | MUST NOT carry |
 * |--------------------------|----------------|----------------|
 * | `present` / `unconfirmed`| a `value` key  | —              |
 * | `absent`                 | —              | a `value` key  |
 * | `withheld`               | `licenceClass` | a `value` key  |
 *
 * Without those clauses `{"presence":"present"}` with no `value` at all was a Field by every guard
 * in this package: `hasValue` said true, the glyph read `—`, and a face printed a confirmed
 * UNKNOWN — which is the exact lie the four-state design exists to make unrepresentable. It is
 * checked HERE rather than only in {@link assertFieldHonest} because the JSON boundary is where
 * such objects come from and `isField` is what the boundary calls.
 *
 * Says nothing about honesty (a MODEL value's receipt, a withheld value's licence class being
 * non-blank) — {@link assertFieldHonest} does that.
 */
export function isField(v: unknown): v is Field<unknown> {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Partial<Field<unknown>> & { watermark?: { source?: unknown }; value?: unknown; licenceClass?: unknown; reason?: unknown }
  if (!PRESENCES.includes(o.presence as Presence)) return false
  if (!ATTRIBUTIONS.includes(o.attribution as Attribution)) return false
  if (typeof o.watermark !== 'object' || o.watermark === null || typeof o.watermark.source !== 'string') return false
  if (o.watermark.modelVersion !== undefined && typeof o.watermark.modelVersion !== 'string') return false
  if (!isAsOf(o.asOf)) return false
  if (o.confidence !== undefined && typeof o.confidence !== 'number') return false

  const carriesValueKey = 'value' in o
  switch (o.presence) {
    case 'present':
    case 'unconfirmed':
      return carriesValueKey
    case 'absent':
      return !carriesValueKey && (o.reason === undefined || typeof o.reason === 'string')
    case 'withheld':
      return !carriesValueKey && typeof o.licenceClass === 'string'
    default:
      return false
  }
}

/**
 * True for the built-ins whose state lives in internal slots rather than in own properties, so
 * that `Object.freeze` on them is either a hard error or a lie. See {@link deepFreeze}.
 *
 * `ArrayBuffer.isView` covers every `TypedArray` and `DataView`, and therefore `Buffer` too.
 */
export function isUnfreezable(value: object): boolean {
  return (
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer ||
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof WeakMap ||
    value instanceof WeakSet ||
    (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)
  )
}

/**
 * Freeze a Field, a Frame or any structure this package hands back, all the way down. Shallow
 * freezing is not enough: `f.watermark.modelVersion = 'fabricated-9.9'` rewrites the receipt
 * through a frozen Field, and the glyph then prints the fabrication under the honesty guard's
 * signature.
 *
 * ## Three limits, stated rather than implied
 *
 * **1. It freezes the CALLER'S object, not a copy.** `present(sharedAppState, obs)` freezes
 * `sharedAppState` itself, in place, for the rest of the process — every other holder of that
 * reference finds it frozen. That is a side effect on memory this package does not own. Pass a
 * value the Frame is allowed to keep, or copy it at the call site.
 *
 * **2. Some built-ins cannot be frozen, and this function no longer pretends otherwise.** A
 * typed array with elements makes `Object.freeze` THROW (`TypeError: Cannot freeze array buffer
 * views with elements`) — which made a Field carrying an event hash, a signature or a symbol
 * image unconstructible. A `Date`, `Map` or `Set` does the opposite: `Object.freeze` succeeds,
 * `Object.isFrozen` then returns `true`, and `d.setTime(0)` / `m.set(k, v)` / `s.add(v)` all keep
 * working, because their state is in internal slots and freezing only covers own properties. So
 * {@link isUnfreezable} values are SKIPPED entirely: not frozen, not recursed into, and
 * `Object.isFrozen` on them truthfully reports `false`. **A `Uint8Array`, `Date`, `Map` or `Set`
 * inside a Field is mutable.** If that matters for a given value, hold an immutable form of it —
 * a hex string for a hash, an ISO instant for a date, a frozen plain object for a map.
 *
 * **3. It does not recurse into container internals.** A `Map`'s or `Set`'s entries were never
 * reached (they are not own properties) and are not reached now.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  if (isUnfreezable(value)) return value
  Object.freeze(value)
  for (const key of Object.getOwnPropertyNames(value)) deepFreeze((value as Record<string, unknown>)[key], seen)
  return value
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
 *    a hole in the record;
 * 6. anything {@link isField} refuses, including a presence state whose payload contradicts it: a
 *    `present` Field with no `value` key, an `absent` or `withheld` Field carrying one, a
 *    `withheld` Field with no `licenceClass` at all. Those all arrive over the wire, they all
 *    throw a `FieldHonestyError` here rather than a `TypeError` two frames deeper, and a caller
 *    catching `FieldHonestyError` therefore catches every one of them.
 *
 * Call it on any Field that did not come from {@link makeField} — notably one parsed from JSON.
 * {@link makeFrame} calls it on every leaf.
 */
export function assertFieldHonest(field: Field<unknown>, where = 'Field'): void {
  if (!isField(field)) {
    throw new FieldHonestyError(
      `${where} is not a Field — it needs presence, attribution, watermark.source, asOf, and the payload its presence state promises ` +
        '(a value for present/unconfirmed, no value for absent/withheld, a licenceClass for withheld)'
    )
  }
  if (isBlank(field.watermark.source)) {
    throw new FieldHonestyError(`${where} carries an empty source watermark — every value names where it came from`)
  }

  const carriesValue = hasValue(field)

  if (field.attribution === 'MODEL') {
    const version = field.watermark.modelVersion
    if (carriesValue) {
      if (version === undefined || isBlank(version)) {
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

  if (field.presence === 'withheld' && isBlank(field.licenceClass)) {
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
      readonly confidence?: ModelConfidence
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
 * violates {@link assertFieldHonest}, and never returns one a caller can go on to edit: the Field
 * is deep-frozen, so the honesty guard is a wall rather than a checkpoint.
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
  return deepFreeze(field)
}

/** The provenance a narrow constructor takes. */
export interface FieldProvenanceSpec {
  readonly attribution: Attribution
  readonly watermark: SourceWatermark
  readonly asOf: AsOf
  readonly confidence?: ModelConfidence
}

/** Narrow constructor: a confirmed value. */
export function present<T>(value: T, provenance: FieldProvenanceSpec): Field<T> {
  return makeField<T>({ ...provenance, presence: 'present', value })
}

/** Narrow constructor: a local optimistic value the server has not acknowledged. */
export function unconfirmed<T>(value: T, provenance: FieldProvenanceSpec): Field<T> {
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
