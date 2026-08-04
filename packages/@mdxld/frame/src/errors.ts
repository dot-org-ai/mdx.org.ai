/**
 * The fail-closed error classes. Every one of these is thrown, never logged and never
 * downgraded to a warning: a contract this package cannot uphold is a defect the author
 * must fix, not a condition a renderer works around.
 *
 * @packageDocumentation
 */

/**
 * A value would misrepresent its provenance. Thrown at construction (and again when a Frame
 * is assembled, for Fields that arrived across a JSON boundary and never met a constructor).
 * Ported from kestrel's `KernelHonestyError`.
 */
export class FieldHonestyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FieldHonestyError'
  }
}

/**
 * A Frame could not be assembled: a duplicate Role id, a leaf that is not a Field, a Role the
 * View never declared.
 */
export class FrameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FrameError'
  }
}

/**
 * An id was not found. FAIL CLOSED: no fuzzy matching, no best-effort partial render. The
 * error carries the known ids so the caller (agent or human) can correct itself in one round
 * trip — the vis agent-views requirement R4.3.
 */
export class UnknownIdError extends Error {
  /** What kind of id failed to resolve. */
  readonly kind: 'view' | 'role'
  /** The id that was asked for. */
  readonly id: string
  /** Every id that WOULD have resolved, sorted. */
  readonly known: readonly string[]

  constructor(kind: 'view' | 'role', id: string, known: readonly string[]) {
    super(`unknown ${kind} id ${JSON.stringify(id)} — known ${kind} ids: ${known.length === 0 ? '(none)' : known.join(', ')}`)
    this.name = 'UnknownIdError'
    this.kind = kind
    this.id = id
    this.known = known
  }
}

/**
 * A Rendering of a View spent more tokens than the View's declared budget.
 *
 * There is NO truncation, NO elision and NO summarisation tier. An over-budget View is a
 * defect the author must fix — by declaring fewer Roles, a narrower declared column set, or a
 * larger budget. Nothing in this package will silently drop or shorten a value to fit.
 */
export class BudgetExceededError extends Error {
  readonly view: string
  readonly budget: number
  readonly spent: number
  readonly tokenizer: string

  constructor(view: string, budget: number, spent: number, tokenizer: string) {
    super(
      `View ${JSON.stringify(view)} rendered ${spent} tokens against a budget of ${budget} (tokenizer ${tokenizer}) — ` +
        'an over-budget View is a defect the author must fix; this package never truncates, elides or summarises to fit'
    )
    this.name = 'BudgetExceededError'
    this.view = view
    this.budget = budget
    this.spent = spent
    this.tokenizer = tokenizer
  }
}

/** One way two faces of the same Frame disagreed. */
export interface ParityBreach {
  /** `missing` — a Frame Field the face never emitted. `invented` — a value the Frame does not
   * hold. `presence` / `attribution` / `text` — the two faces disagree about one Field. */
  readonly kind: 'missing' | 'invented' | 'presence' | 'attribution' | 'text'
  /** The canonical Field path, e.g. `shipment.status` or `lines[0].gtin`. */
  readonly path: string
  readonly detail: string
}

/**
 * Two Renderings of one Frame do not agree. This is the assertion that lets a designer
 * restructure any markup without breaking the agent face — and it is cheaper than a
 * pixel-perfect snapshot.
 */
export class FaceParityError extends Error {
  readonly breaches: readonly ParityBreach[]

  constructor(breaches: readonly ParityBreach[]) {
    super(`face parity failed with ${breaches.length} breach(es):\n` + breaches.map((b) => `  [${b.kind}] ${b.path}: ${b.detail}`).join('\n'))
    this.name = 'FaceParityError'
    this.breaches = breaches
  }
}
