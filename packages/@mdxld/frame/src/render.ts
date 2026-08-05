/**
 * # Rendering — one serialization of a Frame
 *
 * A **Rendering** never invents or changes a value; it chooses only glyphs, layout and token
 * spend. It has two parameters — a **format** and the **tokenizer** its token costs are measured
 * under. The React face and the markdown face are two Renderings of one Frame.
 *
 * ## The one walk, and the sink seam
 * There is exactly ONE traversal of a Frame ({@link renderFrame}), and every face is a **sink
 * adapter** over it — the shape kestrel proved with `walkKernel`. The walk resolves the View,
 * enforces the Role contract, computes each Field's canonical glyph through
 * {@link renderGlyph}, and hands the finished string to the sink. **A sink is never given the
 * opportunity to author a value**: it places text it was handed, and it decides structure. A new
 * face is a new sink, and it gets completeness and honesty for free.
 *
 * ## The sink declares what it emitted, and the walk is the oracle
 * A sink used to return a bare `string`, and the Rendering's `emitted` list was built by the walk
 * — from the Fields the walk had just handed over. Nothing related the two. A sink could discard
 * every value it was given, return `"Status: DELIVERED. Unit price: $4.20. Temperature: 0°C."`,
 * and the Rendering would carry a perfect emissions list asserting the withheld price and the
 * absent temperature. Face parity read that list and passed. The list was the answer key, not the
 * answer.
 *
 * So {@link RenderSink.endFrame} returns a {@link SinkReport}: the body AND the sink's own claim
 * about what it emitted, path by path, including {@link EmittedValue.wrote} — the literal
 * fragments it put into the body for each Field. {@link renderFrame} then **reconciles** that
 * claim against the walk and against the body, and throws a {@link FaceParityError} on any
 * divergence.
 *
 * ## Exactly what reconciliation checks
 *
 * Against the walk, per Field — and the walk is an oracle the sink cannot influence:
 *
 * - **path set equality.** It refuses a sink that never emitted a Field the walk handed it, that
 *   emitted a path the walk never produced, or that emitted one path twice;
 * - **presence, attribution and `text`.** `text` must equal the Frame's canonical glyph exactly.
 *
 * Against the body — and **here the sink supplies both sides of the comparison**:
 *
 * - a sink that produced a non-empty body must give a non-empty {@link EmittedValue.wrote} for
 *   every Field (the discard-everything sink declared none);
 * - each distinct declared fragment must occur in the body **at least** as many times as it was
 *   declared, counted over the whole body.
 *
 * ## Exactly what it does NOT check. Read this before trusting it.
 *
 * **1. `wrote` is not related to `text` in any way.** Nothing requires a declared fragment to be
 * the glyph, to contain the glyph, to be an escaping of the glyph, or to be non-trivial. A sink
 * that declares `wrote: [' ']` for every Field and returns a body of pure invention —
 * `"Status: DELIVERED. Unit price: $4.20."` — **passes**, verified. The body contains a space, so
 * the count check is satisfied, and no other clause looks at `wrote` at all. What is actually
 * checked is that *fragments the face declares* occur in *the body the same face returns*.
 *
 * **2. The glyph is frequently not in the bytes, by design.** Any face that escapes writes
 * something else. `present('x | y')` has the canonical glyph `x | y [OBS epcis-spine]` while the
 * markdown body holds `x \| y [OBS epcis-spine]`, so `body.includes(glyph)` is `false`. This is
 * correct behaviour — it is why {@link EmittedValue.wrote} exists — and it means "the honest glyph
 * is in the bytes" is not a sentence this package can say.
 *
 * **3. There is no position check.** Occurrences are counted over the entire body; nothing relates
 * a fragment to the address it was declared under. A face can therefore write every glyph exactly
 * once and put each one at the WRONG address — `lines[0]`'s GTIN paired with `lines[1]`'s
 * quantity — and reconciliation passes, verified. Right glyphs, wrong rows, clean render. That is
 * the failure the path system exists to prevent and it is not currently prevented.
 *
 * **4. It is not a parse.** Bytes between and around the declared fragments are unconstrained. A
 * body containing the honest glyph for `unitPrice` may also contain a sentence contradicting it.
 *
 * **5. An empty body skips the byte checks entirely** — deliberately, for a face with no textual
 * body, and see {@link declareRendering} for the honest door to that case.
 *
 * What reconciliation genuinely buys, then, is narrower than it sounds: **a face cannot silently
 * drop, invent, duplicate or re-word a Field**, because those are all checked against the walk;
 * and a face that returns a body must name bytes for every Field, which kills the
 * discard-everything sink of the previous paragraph. It buys nothing about *where* those bytes
 * went or *what else* is around them. Closing (1) and (3) — declare the escape, assert
 * `unescape(wrote.join(''))` covers `valueText`, and check emission order monotonically against
 * position in the body — is tracked as a follow-up, and until it lands this section is the
 * contract.
 *
 * ## An over-budget View throws, against a PER-FACE budget
 * After the sink returns its report, the tokenizer counts the body against `view.budgets[format]`.
 * Over budget is a {@link BudgetExceededError} — no truncation, no elision, no summarisation tier.
 * A face with no declared budget is refused: see the note in `view.ts` for why one number could
 * never have covered both faces.
 *
 * ## No HTML, anywhere
 * The markdown face is DERIVED from Fields. This package has no HTML renderer, no DOM, and no
 * HTML-to-markdown converter, and it never will: laundering markup into markdown is how a face
 * stops being a serialization of the model and starts being a transcription of a screen.
 *
 * @packageDocumentation
 */

import { BudgetExceededError, FaceParityError, FrameError, type ParityBreach } from './errors.js'
import type { Attribution, Presence } from './field.js'
import { cellPath, scalarPath, STATE_KEY, type Frame, type FieldMap, type PathedField, type RoleFrame, type RoleState, type SnapshotToken } from './frame.js'
import { provenanceMark, renderGlyph, valueText } from './glyph.js'
import { approxCharsPerToken, type TokenAccount, type Tokenizer } from './tokenize.js'
import { isHonestBudget, type RoleSpec, type View, type ViewRegistry } from './view.js'

/** One value a face emitted, with the address it emitted it for. */
export interface EmittedValue {
  /** The canonical Field path — `role.key`, or `role[i].key` for a row cell. */
  readonly path: string
  readonly presence: Presence
  readonly attribution: Attribution
  /** The canonical glyph ({@link renderGlyph}) a reader of this face recovers for this Field. */
  readonly text: string
  /**
   * The literal fragments this face wrote into its body for this Field — what a reader recombines
   * to recover {@link text}. Usually one string; two when the face factors part of the glyph
   * elsewhere (the markdown `legend` mode writes the value in the cell and the provenance mark in
   * the legend line).
   *
   * Absent for a face with no textual body (a React face declaring through
   * {@link declareRendering}). A sink that DOES produce a body must declare fragments for every
   * Field: a face that emits bytes it will not name is the case reconciliation exists to catch.
   *
   * **What is enforced is weaker than the sentence above.** The ONLY check on these strings is
   * that each occurs in the body at least as often as it is declared. Nothing relates them to
   * {@link text}: `wrote: [' ']` satisfies the check for every Field of every Frame, and nothing
   * relates them to a POSITION either, so the right fragments at the wrong addresses pass. Both
   * are demonstrated in `render.test.ts` and spelled out in the module note. Declaring these
   * honestly is currently on the face author, not on this package.
   *
   * Note that for an escaping face `wrote: [glyph]` is simply WRONG — the markdown face writes
   * `x \| y [OBS s]` for the glyph `x | y [OBS s]` — and the render will throw, which is the one
   * piece of feedback an author does get here.
   */
  readonly wrote?: readonly string[]
}

/** What a sink returns: its body, and its own claim about what it put in there. */
export interface SinkReport {
  /** The serialization itself. */
  readonly body: string
  /** What this face says it emitted, in emission order. Reconciled against the walk. */
  readonly emitted: readonly EmittedValue[]
}

/** One serialization of a Frame. */
export interface Rendering {
  readonly view: string
  /** The face that produced it — `markdown`, `data`, `react`, whatever a sink calls itself. */
  readonly format: string
  readonly snapshot: SnapshotToken
  /** Every value this face emitted, in emission order. The input to {@link assertFaceParity}. */
  readonly emitted: readonly EmittedValue[]
  /** The serialization itself. A non-textual face (React elements) reports its own; see `declareRendering`. */
  readonly body: string
  /**
   * Budget accounting, when this Rendering was actually measured. **Absent when it was not** —
   * {@link declareRendering} used to fabricate `{ budget: Infinity, spent: 0 }`, which is a
   * guessed number wearing the shape of a measurement, in a package whose whole thesis is that a
   * value with no derivation does not get printed.
   */
  readonly tokens?: TokenAccount
}

/** What a sink is told before it starts. */
export interface RenderContext {
  readonly frame: Frame
  readonly view: View
  readonly roles: readonly RoleSpec[]
}

/** The Role state handed to a sink, with its sentence Field already serialized by the walk. */
export interface RoleStateEmission {
  readonly state: RoleState
  /** The sentence Field and its canonical glyph, when the Role declared one. */
  readonly sentence?: { readonly pathed: PathedField; readonly glyph: string }
}

/**
 * A format adapter over the one walk. Every method is called in fixed order; a sink accumulates
 * whatever representation it likes and returns its body AND its emissions claim from
 * {@link RenderSink.endFrame}.
 *
 * The sink is handed `glyph` — it does not compute it. That is the seam that makes "a Rendering
 * never invents or changes a value" a structural property rather than a convention.
 */
export interface RenderSink {
  /** The face's name, recorded on the Rendering, and the key its budget is declared under. */
  readonly format: string
  beginFrame(ctx: RenderContext): void
  beginRole(spec: RoleSpec, role: RoleFrame): void
  /**
   * The Role's declared state, when it has one. Called immediately after `beginRole`. A sink that
   * does not implement it will fail reconciliation on any Frame carrying a state sentence, which
   * is the fail-closed answer: an unrendered BLOCKED reads as EMPTY.
   */
  roleState?(spec: RoleSpec, emission: RoleStateEmission): void
  /** A scalar Field, or a row cell when `pathed.row` is set. `glyph` is the canonical text. */
  field(pathed: PathedField, spec: RoleSpec, glyph: string): void
  beginRow(spec: RoleSpec, index: number): void
  endRow(spec: RoleSpec, index: number): void
  endRole(spec: RoleSpec, role: RoleFrame): void
  endFrame(): SinkReport
}

/** Options for {@link renderFrame}. */
export interface RenderOptions {
  readonly registry: ViewRegistry
  readonly sink: RenderSink
  /** Defaults to {@link approxCharsPerToken}. Named in the Rendering's token account. */
  readonly tokenizer?: Tokenizer
  /**
   * Overrides the View's standing budget for THIS face, for this one Rendering. Still enforced,
   * still throws — and now validated: an unvalidated override let `NaN` through, and `spent > NaN`
   * is `false`, so a `NaN` budget silently disabled budgeting altogether. It is held to the same
   * `Number.isFinite(b) && b > 0` contract the standing budget is.
   */
  readonly budget?: number
}

function keyOrder(declared: readonly string[], actual: readonly string[], where: string): readonly string[] {
  const declaredSet = new Set(declared)
  const actualSet = new Set(actual)
  const missing = declared.filter((k) => !actualSet.has(k))
  const extra = actual.filter((k) => !declaredSet.has(k))
  if (missing.length > 0) {
    throw new FrameError(
      `${where} declares keys [${declared.join(', ')}] but the Frame has no Field for [${missing.join(', ')}] — a declared key with no Field is a defect, not an absence`
    )
  }
  if (extra.length > 0) {
    throw new FrameError(
      `${where} carries Fields [${extra.join(', ')}] that its declared key set does not include — a Frame never carries a value no face will show. Project it away where the Frame is assembled, or declare the key.`
    )
  }
  return declared
}

/** The Role contract: a `list` Role holds scalars, a `table` Role holds rows. Never both. */
function assertRoleShape(spec: RoleSpec, role: RoleFrame): void {
  const scalars = Object.keys(role.fields ?? {})
  const rows = role.rows ?? []
  if (spec.markdown.kind === 'list' && rows.length > 0) {
    throw new FrameError(
      `Role ${JSON.stringify(spec.id)} declares a list face but the Frame carries rows — a Role holds scalars or rows, never both; declare a second Role`
    )
  }
  if (spec.markdown.kind === 'table' && scalars.length > 0) {
    throw new FrameError(
      `Role ${JSON.stringify(spec.id)} declares a table face but the Frame carries scalar Fields — a Role holds scalars or rows, never both; declare a second Role`
    )
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === '') return 0
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count++
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

/**
 * Reconcile a sink's claim against the walk (the oracle) and against its own bytes. Returns every
 * way they diverge.
 *
 * The walk half is an independent check. The byte half is NOT: the sink supplies both the
 * fragments and the body they are counted in, so it establishes only internal consistency between
 * two things the same face authored. Read the module note's "Exactly what it does NOT check"
 * before treating a clean reconciliation as a statement about the bytes.
 */
function reconcile(format: string, walked: readonly EmittedValue[], report: SinkReport): ParityBreach[] {
  const breaches: ParityBreach[] = []
  const claimed = new Map<string, EmittedValue>()
  for (const value of report.emitted) {
    if (claimed.has(value.path)) {
      breaches.push({ kind: 'invented', path: value.path, detail: `face ${format} emitted this Field twice` })
      continue
    }
    claimed.set(value.path, value)
  }

  const walkedPaths = new Set(walked.map((w) => w.path))
  for (const expected of walked) {
    const actual = claimed.get(expected.path)
    if (actual === undefined) {
      breaches.push({
        kind: 'missing',
        path: expected.path,
        detail: `the walk handed face ${format} this Field and the face did not report emitting it`,
      })
      continue
    }
    if (actual.presence !== expected.presence) {
      breaches.push({ kind: 'presence', path: expected.path, detail: `face ${format} reports ${actual.presence}; the Frame holds ${expected.presence}` })
    }
    if (actual.attribution !== expected.attribution) {
      breaches.push({ kind: 'attribution', path: expected.path, detail: `face ${format} reports ${actual.attribution}; the Frame holds ${expected.attribution}` })
    }
    if (actual.text !== expected.text) {
      breaches.push({
        kind: 'text',
        path: expected.path,
        detail: `face ${format} reports ${JSON.stringify(actual.text)}; the Frame's canonical glyph is ${JSON.stringify(expected.text)}`,
      })
    }
  }
  for (const path of claimed.keys()) {
    if (!walkedPaths.has(path)) {
      breaches.push({ kind: 'invented', path, detail: `face ${format} reports emitting a path the walk never produced` })
    }
  }

  if (report.body !== '') {
    const declaredCounts = new Map<string, number>()
    for (const value of report.emitted) {
      const fragments = value.wrote
      if (fragments === undefined || fragments.length === 0) {
        breaches.push({
          kind: 'bytes',
          path: value.path,
          detail: `face ${format} produced a body but declared none of the bytes it wrote for this Field — a face that emits bytes it will not name cannot be reconciled with them`,
        })
        continue
      }
      for (const fragment of fragments) declaredCounts.set(fragment, (declaredCounts.get(fragment) ?? 0) + 1)
    }
    for (const [fragment, declared] of declaredCounts) {
      const found = countOccurrences(report.body, fragment)
      if (found < declared) {
        breaches.push({
          kind: 'bytes',
          path: '(body)',
          detail: `face ${format} declared it wrote ${JSON.stringify(fragment)} ${declared} time(s); the body contains it ${found} time(s)`,
        })
      }
    }
  }

  return breaches
}

/**
 * The ONE Frame traversal. Resolves the View (fail-closed on an unknown id), checks the Frame's
 * Roles against the View's, walks every Field in declared order, drives the sink, reconciles the
 * sink's report against the walk, and counts the body against the face's declared budget. Returns
 * the Rendering, or throws.
 */
export function renderFrame(frame: Frame, options: RenderOptions): Rendering {
  const { registry, sink } = options
  const tokenizer = options.tokenizer ?? approxCharsPerToken
  const view = registry.view(frame.view)
  const specs = registry.rolesOf(view)

  if (options.budget !== undefined && !isHonestBudget(options.budget)) {
    throw new TypeError(
      `the budget override for face ${JSON.stringify(sink.format)} is ${String(options.budget)} — a token budget must be a positive, finite number, and an unvalidated one silently disables budgeting (every comparison against NaN is false)`
    )
  }
  const budget = options.budget ?? view.budgets[sink.format]
  if (budget === undefined) {
    throw new TypeError(
      `View ${JSON.stringify(view.id)} declares no token budget for face ${JSON.stringify(sink.format)} — budgets are per face (declared: ${Object.keys(view.budgets).join(', ')}). A budget nobody measured is not a default this package will invent.`
    )
  }

  const framed = new Map(frame.roles.map((r) => [r.role, r]))
  if (framed.size !== frame.roles.length) throw new FrameError(`Frame for View ${JSON.stringify(view.id)} carries a duplicate Role`)
  for (const role of frame.roles) {
    if (!view.roles.includes(role.role)) {
      throw new FrameError(
        `Frame carries Role ${JSON.stringify(role.role)} which View ${JSON.stringify(view.id)} does not select — the View decides what is seen`
      )
    }
  }

  const walked: EmittedValue[] = []
  const record = (pathed: PathedField, glyph: string): void => {
    walked.push({ path: pathed.path, presence: pathed.field.presence, attribution: pathed.field.attribution, text: glyph })
  }

  sink.beginFrame({ frame, view, roles: specs })

  for (const spec of specs) {
    const role = framed.get(spec.id)
    if (role === undefined) {
      throw new FrameError(
        `View ${JSON.stringify(view.id)} selects Role ${JSON.stringify(spec.id)} but the Frame carries no such Role — a selected Role is materialised or the View is wrong`
      )
    }
    assertRoleShape(spec, role)
    sink.beginRole(spec, role)

    if (role.state !== undefined) {
      const sentence = role.state.sentence
      let emission: RoleStateEmission
      if (sentence === undefined) {
        emission = { state: role.state }
      } else {
        const pathed: PathedField = { path: scalarPath(spec.id, STATE_KEY), role: spec.id, key: STATE_KEY, field: sentence }
        const glyph = renderGlyph(sentence)
        emission = { state: role.state, sentence: { pathed, glyph } }
        record(pathed, glyph)
      }
      if (sink.roleState === undefined) {
        if (sentence !== undefined) {
          throw new FrameError(
            `Role ${JSON.stringify(spec.id)} declares a state sentence but face ${JSON.stringify(sink.format)} implements no roleState — an unrendered BLOCKED reads as EMPTY`
          )
        }
      } else {
        sink.roleState(spec, emission)
      }
    }

    if (spec.markdown.kind === 'list') {
      const fields = role.fields ?? {}
      const order = keyOrder(spec.markdown.keys, Object.keys(fields), `Role ${JSON.stringify(spec.id)}`)
      for (const key of order) {
        const field = fields[key] as FieldMap[string]
        const pathed: PathedField = { path: scalarPath(spec.id, key), role: spec.id, key, field }
        const glyph = renderGlyph(field)
        sink.field(pathed, spec, glyph)
        record(pathed, glyph)
      }
    } else {
      const rows = role.rows ?? []
      const columns = spec.markdown.keys
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as FieldMap
        keyOrder(columns, Object.keys(row), `Role ${JSON.stringify(spec.id)} row ${i}`)
        sink.beginRow(spec, i)
        for (const key of columns) {
          const field = row[key] as FieldMap[string]
          const pathed: PathedField = { path: cellPath(spec.id, i, key), role: spec.id, key, row: i, field }
          const glyph = renderGlyph(field)
          sink.field(pathed, spec, glyph)
          record(pathed, glyph)
        }
        sink.endRow(spec, i)
      }
    }

    sink.endRole(spec, role)
  }

  const report = sink.endFrame()
  const breaches = reconcile(sink.format, walked, report)
  if (breaches.length > 0) throw new FaceParityError(breaches)

  const spent = tokenizer.count(report.body)
  if (spent > budget) throw new BudgetExceededError(view.id, budget, spent, tokenizer.id)

  return {
    view: view.id,
    format: sink.format,
    snapshot: frame.snapshot,
    emitted: report.emitted,
    body: report.body,
    tokens: { tokenizer: tokenizer.id, budget, spent },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The markdown face — derived from Fields, never laundered from HTML
// ─────────────────────────────────────────────────────────────────────────────

function asOfText(asOf: SnapshotToken['asOf']): string {
  return 'seq' in asOf ? `seq ${asOf.seq}` : asOf.instant
}

function labelOf(spec: RoleSpec, key: string): string {
  return spec.markdown.labels?.[key] ?? key
}

/**
 * Escape a value so it cannot author markdown STRUCTURE.
 *
 * A Field's value is data, and in a shared-record domain it is very often data a counterparty
 * wrote: a shipment note, a partner name, a licence class from a partner feed. Emitted raw, a `|`
 * breaks a table's columns and shifts every subsequent cell under the wrong heading, and a
 * newline lets a value open a `## Shipment` section and a `- **Status**: DELIVERED` line of its
 * own — a forged section in the agent face, authored by whoever supplied the string. Face parity
 * does not catch it: the emitted VALUE is exactly what the Frame held. It is the structure around
 * it that was invented, and structure is the one thing a face does decide.
 *
 * So the sink escapes at its own boundary: newlines flatten to a literal `\n`, `|` becomes `\|`,
 * and a leading block-marker character is backslash-escaped. The canonical glyph is unchanged —
 * only the bytes are — which is why {@link EmittedValue.wrote} exists to declare the escaped form.
 */
export function escapeMarkdown(text: string): string {
  const flattened = text.replace(/\r\n|\r|\n/g, '\\n').replace(/\|/g, '\\|')
  return /^[#>\-+]/.test(flattened) ? `\\${flattened}` : flattened
}

/**
 * The markdown sink. Structure from the declared face; every value straight from the walk.
 *
 * **Single use.** It is a stateful closure over its accumulated lines, and it has no reset, so
 * driving one instance through two Frames used to silently concatenate them into one body — a
 * doubled render that face parity reads as every Field emitted twice. It is a public extension
 * point, so this is now explicit: a second `beginFrame` throws. Call `markdownSink()` again.
 */
export function markdownSink(): RenderSink {
  const lines: string[] = []
  const emitted: EmittedValue[] = []
  let table: { spec: RoleSpec; columns: readonly string[]; rows: { path: string; value: string; mark: string; field: PathedField['field'] }[][] } | null = null
  let current: { path: string; value: string; mark: string; field: PathedField['field'] }[] = []
  let started = false

  const emit = (pathed: PathedField, glyph: string, wrote: readonly string[]): void => {
    emitted.push({ path: pathed.path, presence: pathed.field.presence, attribution: pathed.field.attribution, text: glyph, wrote })
  }

  return {
    format: 'markdown',
    beginFrame(ctx: RenderContext): void {
      if (started) throw new FrameError('markdownSink() is single-use — it accumulates lines and has no reset; construct a new one per Rendering')
      started = true
      lines.push(`_snapshot ${escapeMarkdown(ctx.frame.snapshot.token)} · as of ${escapeMarkdown(asOfText(ctx.frame.snapshot.asOf))}_`)
    },
    beginRole(spec: RoleSpec, _role: RoleFrame): void {
      lines.push('', `${'#'.repeat(spec.markdown.heading ?? 2)} ${escapeMarkdown(spec.title)}`, '')
      if (spec.markdown.kind === 'table') table = { spec, columns: spec.markdown.keys, rows: [] }
    },
    roleState(_spec: RoleSpec, emission: RoleStateEmission): void {
      lines.push(`_state: ${emission.state.kind}_`)
      const sentence = emission.sentence
      if (sentence !== undefined) {
        const wrote = escapeMarkdown(sentence.glyph)
        lines.push(`_${wrote}_`)
        emit(sentence.pathed, sentence.glyph, [wrote])
      }
      lines.push('')
    },
    beginRow(): void {
      current = []
    },
    field(pathed: PathedField, spec: RoleSpec, glyph: string): void {
      if (spec.markdown.kind === 'list') {
        const wrote = escapeMarkdown(glyph)
        lines.push(`- **${escapeMarkdown(labelOf(spec, pathed.key))}**: ${wrote}`)
        emit(pathed, glyph, [wrote])
        return
      }
      current.push({ path: pathed.path, value: valueText(pathed.field), mark: provenanceMark(pathed.field), field: pathed.field })
    },
    endRow(): void {
      if (table !== null) table.rows.push(current)
      current = []
    },
    endRole(spec: RoleSpec): void {
      if (spec.markdown.kind !== 'table' || table === null) return
      const { columns, rows } = table
      lines.push(`| ${columns.map((k) => escapeMarkdown(labelOf(spec, k))).join(' | ')} |`)
      lines.push(`|${columns.map(() => ' --- ').join('|')}|`)

      const legendMode = spec.markdown.provenance === 'legend'
      const uniform = columns.map((_, c) => {
        if (!legendMode || rows.length === 0) return null
        const first = rows[0]?.[c]?.mark
        if (first === undefined) return null
        return rows.every((r) => r[c]?.mark === first) ? first : null
      })
      const legendEntries = columns.map((k, c) => (uniform[c] === null ? null : `${escapeMarkdown(labelOf(spec, k))}: ${escapeMarkdown(uniform[c] as string)}`))

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] as { path: string; value: string; mark: string; field: PathedField['field'] }[]
        const cells: string[] = []
        for (let c = 0; c < columns.length; c++) {
          const cell = row[c]
          if (cell === undefined) {
            cells.push('')
            continue
          }
          const factored = uniform[c] !== null
          const written = escapeMarkdown(factored ? cell.value : `${cell.value} ${cell.mark}`)
          cells.push(written)
          // The mark of a factored column is written ONCE, in the legend line under the table. The
          // first row declares that fragment so reconciliation checks the legend actually carries
          // it — the mark moves, and if it ever stopped moving this would fail rather than pass.
          const legend = legendEntries[c]
          const wrote = factored && r === 0 && legend != null ? [written, legend] : [written]
          emit({ path: cell.path, role: spec.id, key: columns[c] as string, row: r, field: cell.field }, `${cell.value} ${cell.mark}`, wrote)
        }
        lines.push(`| ${cells.join(' | ')} |`)
      }

      const legend = legendEntries.filter((s): s is string => s !== null)
      if (legend.length > 0) lines.push('', `_provenance — ${legend.join('; ')}_`)
      table = null
    },
    endFrame(): SinkReport {
      return { body: `${lines.join('\n')}\n`, emitted }
    },
  }
}

/**
 * The version of the data face's shape. R1.3 asks for stable field names and a **versioned
 * shape**; a JSON face with no version is one whose consumers must guess whether a new key is a
 * new capability or a different contract.
 */
export const DATA_FACE_VERSION = 'mdxld.frame.data/1'

/**
 * The data (JSON) face. It IS the Frame — the Fields verbatim, plus the canonical glyph each
 * face is held to, so an agent reading JSON and an agent reading markdown provably read the same
 * strings.
 *
 * **It is not the wire format**, and this package does not claim it is. Nothing has run on it: no
 * app has fetched it, no client has parsed it, no version of it has ever been superseded. Calling
 * it the wire format before one consumer has used it in anger would be a stability claim with no
 * evidence — exactly the shape of claim this package refuses everywhere else. It is versioned so
 * that it CAN become one.
 */
export function dataSink(): RenderSink {
  type RoleBlock = { role: string; title: string; state?: { kind: string }; values: Record<string, unknown>[] }
  const payload: { face: string; version: string; view: string; snapshot: SnapshotToken | null; roles: RoleBlock[] } = {
    face: 'data',
    version: DATA_FACE_VERSION,
    view: '',
    snapshot: null,
    roles: [],
  }
  const emitted: EmittedValue[] = []
  let currentRole: RoleBlock | null = null
  let started = false

  const entryFor = (pathed: PathedField, glyph: string): Record<string, unknown> => {
    const f = pathed.field
    const entry: Record<string, unknown> = {
      path: pathed.path,
      key: pathed.key,
      presence: f.presence,
      attribution: f.attribution,
      source: f.watermark.source,
      asOf: f.asOf,
      text: glyph,
    }
    if (pathed.row !== undefined) entry.row = pathed.row
    if (f.watermark.modelVersion !== undefined) entry.modelVersion = f.watermark.modelVersion
    if (f.confidence !== undefined) entry.confidence = f.confidence
    if (f.presence === 'present' || f.presence === 'unconfirmed') entry.value = f.value
    if (f.presence === 'withheld') entry.licenceClass = f.licenceClass
    if (f.presence === 'absent' && f.reason !== undefined) entry.reason = f.reason
    return entry
  }

  const emit = (pathed: PathedField, glyph: string): void => {
    currentRole?.values.push(entryFor(pathed, glyph))
    // The glyph reaches the body JSON-escaped; that is the literal fragment to declare.
    emitted.push({
      path: pathed.path,
      presence: pathed.field.presence,
      attribution: pathed.field.attribution,
      text: glyph,
      wrote: [JSON.stringify(glyph).slice(1, -1)],
    })
  }

  return {
    format: 'data',
    beginFrame(ctx: RenderContext): void {
      if (started) throw new FrameError('dataSink() is single-use — it accumulates a payload and has no reset; construct a new one per Rendering')
      started = true
      payload.view = ctx.view.id
      payload.snapshot = ctx.frame.snapshot
    },
    beginRole(spec: RoleSpec): void {
      currentRole = { role: spec.id, title: spec.title, values: [] }
      payload.roles.push(currentRole)
    },
    roleState(_spec: RoleSpec, emission: RoleStateEmission): void {
      if (currentRole !== null) currentRole.state = { kind: emission.state.kind }
      if (emission.sentence !== undefined) emit(emission.sentence.pathed, emission.sentence.glyph)
    },
    beginRow(): void {
      /* rows are addressed by path; no per-row envelope in the data face */
    },
    field(pathed: PathedField, _spec: RoleSpec, glyph: string): void {
      emit(pathed, glyph)
    },
    endRow(): void {
      /* no-op */
    },
    endRole(): void {
      currentRole = null
    },
    endFrame(): SinkReport {
      return { body: JSON.stringify(payload), emitted }
    },
  }
}

/** Render the markdown face of a Frame. */
export function renderMarkdown(frame: Frame, options: Omit<RenderOptions, 'sink'>): Rendering {
  return renderFrame(frame, { ...options, sink: markdownSink() })
}

/** Render the data (JSON) face of a Frame. */
export function renderData(frame: Frame, options: Omit<RenderOptions, 'sink'>): Rendering {
  return renderFrame(frame, { ...options, sink: dataSink() })
}

/**
 * Declare a Rendering that this package did not walk — a React face, a Slack blocks face, any
 * face whose body is not a string this module produced.
 *
 * This is the ONLY way a face gets into {@link assertFaceParity} without going through
 * {@link renderFrame}, and it is deliberately explicit: what it declares is a CLAIM about what
 * the face emitted, and the parity assertion is what holds that claim to the Frame. A face that
 * emits bytes it does not declare is out of contract — which is exactly why a face should be a
 * {@link RenderSink} and get its declaration generated and reconciled.
 *
 * `tokens` is **absent** unless the caller measured them. It used to default to
 * `{ budget: Infinity, spent: 0 }`, which reports a measurement that was never taken.
 */
export function declareRendering(spec: {
  view: string
  format: string
  snapshot: SnapshotToken
  emitted: readonly EmittedValue[]
  body?: string
  tokens?: TokenAccount
}): Rendering {
  const rendering: Rendering = {
    view: spec.view,
    format: spec.format,
    snapshot: spec.snapshot,
    emitted: spec.emitted,
    body: spec.body ?? '',
  }
  return spec.tokens === undefined ? rendering : { ...rendering, tokens: spec.tokens }
}
