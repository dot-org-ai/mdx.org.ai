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
 * ## An over-budget View throws
 * After the sink returns its body, the tokenizer counts it. Over budget is a
 * {@link BudgetExceededError} — no truncation, no elision, no summarisation tier. An over-budget
 * View is a defect the author must fix.
 *
 * ## No HTML, anywhere
 * The markdown face is DERIVED from Fields. This package has no HTML renderer, no DOM, and no
 * HTML-to-markdown converter, and it never will: laundering markup into markdown is how a face
 * stops being a serialization of the model and starts being a transcription of a screen.
 *
 * @packageDocumentation
 */

import { BudgetExceededError, FrameError } from './errors.js'
import type { Attribution, Presence } from './field.js'
import { cellPath, scalarPath, type Frame, type FieldMap, type PathedField, type RoleFrame, type SnapshotToken } from './frame.js'
import { provenanceMark, renderGlyph, valueText } from './glyph.js'
import { approxCharsPerToken, type TokenAccount, type Tokenizer } from './tokenize.js'
import type { RoleSpec, View, ViewRegistry } from './view.js'

/** One value a face emitted, with the address it emitted it for. */
export interface EmittedValue {
  /** The canonical Field path — `role.key`, or `role[i].key` for a row cell. */
  readonly path: string
  readonly presence: Presence
  readonly attribution: Attribution
  /** The canonical glyph ({@link renderGlyph}) the face was handed for this Field. */
  readonly text: string
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
  readonly tokens: TokenAccount
}

/** What a sink is told before it starts. */
export interface RenderContext {
  readonly frame: Frame
  readonly view: View
  readonly roles: readonly RoleSpec[]
}

/**
 * A format adapter over the one walk. Every method is called in fixed order; a sink accumulates
 * whatever representation it likes and returns its body from {@link RenderSink.endFrame}.
 *
 * The sink is handed `glyph` — it does not compute it. That is the seam that makes "a Rendering
 * never invents or changes a value" a structural property rather than a convention.
 */
export interface RenderSink {
  /** The face's name, recorded on the Rendering. */
  readonly format: string
  beginFrame(ctx: RenderContext): void
  beginRole(spec: RoleSpec, role: RoleFrame): void
  /** A scalar Field, or a row cell when `pathed.row` is set. `glyph` is the canonical text. */
  field(pathed: PathedField, spec: RoleSpec, glyph: string): void
  beginRow(spec: RoleSpec, index: number): void
  endRow(spec: RoleSpec, index: number): void
  endRole(spec: RoleSpec, role: RoleFrame): void
  endFrame(): string
}

/** Options for {@link renderFrame}. */
export interface RenderOptions {
  readonly registry: ViewRegistry
  readonly sink: RenderSink
  /** Defaults to {@link approxCharsPerToken}. Named in the Rendering's token account. */
  readonly tokenizer?: Tokenizer
  /** Overrides the View's standing budget for this one Rendering. Still enforced, still throws. */
  readonly budget?: number
}

function keyOrder(declared: readonly string[] | undefined, actual: readonly string[], where: string): readonly string[] {
  if (declared === undefined) return actual
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
  if (spec.markdown.kind === 'table' && rows.length === 0 && spec.markdown.keys === undefined) {
    throw new FrameError(`Role ${JSON.stringify(spec.id)} has no rows and declares no keys — an empty table cannot name its own columns`)
  }
}

/**
 * The ONE Frame traversal. Resolves the View (fail-closed on an unknown id), checks the Frame's
 * Roles against the View's, walks every Field in declared order, and drives the sink. Returns the
 * Rendering, or throws {@link BudgetExceededError} if the body exceeds the budget.
 */
export function renderFrame(frame: Frame, options: RenderOptions): Rendering {
  const { registry, sink } = options
  const tokenizer = options.tokenizer ?? approxCharsPerToken
  const view = registry.view(frame.view)
  const specs = registry.rolesOf(view)
  const budget = options.budget ?? view.budget

  const framed = new Map(frame.roles.map((r) => [r.role, r]))
  if (framed.size !== frame.roles.length) throw new FrameError(`Frame for View ${JSON.stringify(view.id)} carries a duplicate Role`)
  for (const role of frame.roles) {
    if (!view.roles.includes(role.role)) {
      throw new FrameError(
        `Frame carries Role ${JSON.stringify(role.role)} which View ${JSON.stringify(view.id)} does not select — the View decides what is seen`
      )
    }
  }

  const emitted: EmittedValue[] = []
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

    if (spec.markdown.kind === 'list') {
      const fields = role.fields ?? {}
      const order = keyOrder(spec.markdown.keys, Object.keys(fields), `Role ${JSON.stringify(spec.id)}`)
      for (const key of order) {
        const field = fields[key] as FieldMap[string]
        const pathed: PathedField = { path: scalarPath(spec.id, key), role: spec.id, key, field }
        const glyph = renderGlyph(field)
        sink.field(pathed, spec, glyph)
        emitted.push({ path: pathed.path, presence: field.presence, attribution: field.attribution, text: glyph })
      }
    } else {
      const rows = role.rows ?? []
      const first = rows[0]
      // With no rows there is nothing to check the declared columns against — an empty register
      // is a legitimate state, and `assertRoleShape` already refused an empty table that cannot
      // name its own columns.
      const columns = first === undefined ? (spec.markdown.keys ?? []) : keyOrder(spec.markdown.keys, Object.keys(first), `Role ${JSON.stringify(spec.id)}`)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as FieldMap
        keyOrder(columns, Object.keys(row), `Role ${JSON.stringify(spec.id)} row ${i}`)
        sink.beginRow(spec, i)
        for (const key of columns) {
          const field = row[key] as FieldMap[string]
          const pathed: PathedField = { path: cellPath(spec.id, i, key), role: spec.id, key, row: i, field }
          const glyph = renderGlyph(field)
          sink.field(pathed, spec, glyph)
          emitted.push({ path: pathed.path, presence: field.presence, attribution: field.attribution, text: glyph })
        }
        sink.endRow(spec, i)
      }
    }

    sink.endRole(spec, role)
  }

  const body = sink.endFrame()
  const spent = tokenizer.count(body)
  if (spent > budget) throw new BudgetExceededError(view.id, budget, spent, tokenizer.id)

  return {
    view: view.id,
    format: sink.format,
    snapshot: frame.snapshot,
    emitted,
    body,
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

/** The markdown sink. Structure from the declared face; every value straight from the walk. */
export function markdownSink(): RenderSink {
  const lines: string[] = []
  let table: { spec: RoleSpec; columns: string[]; rows: { value: string; mark: string }[][] } | null = null
  let current: { value: string; mark: string }[] = []

  return {
    format: 'markdown',
    beginFrame(ctx: RenderContext): void {
      lines.push(`_snapshot ${ctx.frame.snapshot.token} · as of ${asOfText(ctx.frame.snapshot.asOf)}_`)
    },
    beginRole(spec: RoleSpec, role: RoleFrame): void {
      lines.push('', `${'#'.repeat(spec.markdown.heading ?? 2)} ${spec.title}`, '')
      if (spec.markdown.kind === 'table') {
        const declared = spec.markdown.keys
        const first = (role.rows ?? [])[0]
        table = { spec, columns: [...(declared ?? (first === undefined ? [] : Object.keys(first)))], rows: [] }
      }
    },
    beginRow(): void {
      current = []
    },
    field(pathed: PathedField, spec: RoleSpec, glyph: string): void {
      if (spec.markdown.kind === 'list') {
        lines.push(`- **${labelOf(spec, pathed.key)}**: ${glyph}`)
        return
      }
      current.push({ value: valueText(pathed.field), mark: provenanceMark(pathed.field) })
    },
    endRow(): void {
      if (table !== null) table.rows.push(current)
      current = []
    },
    endRole(spec: RoleSpec): void {
      if (spec.markdown.kind !== 'table' || table === null) return
      const { columns, rows } = table
      if (rows.length === 0) {
        lines.push('_(no rows)_')
        table = null
        return
      }
      const legendMode = spec.markdown.provenance === 'legend'
      const uniform = columns.map((_, c) => {
        if (!legendMode) return null
        const first = rows[0]?.[c]?.mark
        if (first === undefined) return null
        return rows.every((r) => r[c]?.mark === first) ? first : null
      })
      lines.push(`| ${columns.map((k) => labelOf(spec, k)).join(' | ')} |`)
      lines.push(`|${columns.map(() => ' --- ').join('|')}|`)
      for (const row of rows) {
        lines.push(
          `| ${columns.map((_, c) => (uniform[c] === null ? `${row[c]?.value ?? ''} ${row[c]?.mark ?? ''}`.trim() : (row[c]?.value ?? ''))).join(' | ')} |`
        )
      }
      const legend = columns.map((k, c) => (uniform[c] === null ? null : `${labelOf(spec, k)}: ${uniform[c]}`)).filter((s): s is string => s !== null)
      if (legend.length > 0) lines.push('', `_provenance — ${legend.join('; ')}_`)
      table = null
    },
    endFrame(): string {
      return `${lines.join('\n')}\n`
    },
  }
}

/**
 * The data (JSON) face. It IS the Frame — the Fields verbatim, plus the canonical glyph each
 * face is held to, so an agent reading JSON and an agent reading markdown provably read the same
 * strings.
 */
export function dataSink(): RenderSink {
  const payload: { view: string; snapshot: SnapshotToken | null; roles: { role: string; title: string; values: Record<string, unknown>[] }[] } = {
    view: '',
    snapshot: null,
    roles: [],
  }
  let currentRole: { role: string; title: string; values: Record<string, unknown>[] } | null = null

  return {
    format: 'data',
    beginFrame(ctx: RenderContext): void {
      payload.view = ctx.view.id
      payload.snapshot = ctx.frame.snapshot
    },
    beginRole(spec: RoleSpec): void {
      currentRole = { role: spec.id, title: spec.title, values: [] }
      payload.roles.push(currentRole)
    },
    beginRow(): void {
      /* rows are addressed by path; no per-row envelope in the data face */
    },
    field(pathed: PathedField, _spec: RoleSpec, glyph: string): void {
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
      currentRole?.values.push(entry)
    },
    endRow(): void {
      /* no-op */
    },
    endRole(): void {
      currentRole = null
    },
    endFrame(): string {
      return JSON.stringify(payload)
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
 * {@link RenderSink} and get its declaration generated.
 */
export function declareRendering(spec: {
  view: string
  format: string
  snapshot: SnapshotToken
  emitted: readonly EmittedValue[]
  body?: string
  tokens?: TokenAccount
}): Rendering {
  return {
    view: spec.view,
    format: spec.format,
    snapshot: spec.snapshot,
    emitted: spec.emitted,
    body: spec.body ?? '',
    tokens: spec.tokens ?? { tokenizer: 'undeclared', budget: Number.POSITIVE_INFINITY, spent: 0 },
  }
}
