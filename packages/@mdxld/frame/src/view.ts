/**
 * # View — the standing definition
 *
 * A **View** is what should be seen: which Roles, in what order, at what token budget, addressed
 * by a stable id. It is the standing definition; a {@link Frame} is that View materialised at one
 * moment. A View selects Roles — it never computes. Every value arrives in the Frame.
 *
 * Two fail-closed rules, both ported straight from kestrel and both testable:
 *
 * 1. **Unknown ids fail closed.** Resolving a View id or a Role id that the registry does not
 *    hold throws an {@link UnknownIdError} carrying the known ids. No fuzzy matching, no
 *    best-effort partial render.
 * 2. **An over-budget View throws.** There is no truncation tier, no elision tier and no
 *    summarisation tier. An over-budget View is a defect the author must fix. (Enforced in
 *    `render.ts`, where the tokens are actually counted.)
 *
 * ## The budget is PER FACE, because faces are not the same size
 * A View used to declare one `budget: number` for every serialization of it, and that number
 * cannot be right twice. Measured on this package's own fixture, under its own tokenizer: the
 * markdown face spends 136 tokens and the data face spends 644 — 4.7× apart on eleven Fields, and
 * the gap widens with row count because the data face repeats every key on every cell. One number
 * is therefore either too small for the data face (which then throws on a Frame that is fine) or
 * too large for the markdown face (which then has no budget at all). Both happened: three tests in
 * this package worked around it by passing `budget: 5000` at the call site, which is a budget
 * declared by the caller who wants the render to succeed — the opposite of a standing limit.
 *
 * So {@link View.budgets} is a map keyed by the face's format. `markdown` is required, because a
 * Role with no markdown face cannot be registered and so every View has one. A face with no
 * declared budget is a refusal at render time, not a default: guessing a budget for a face nobody
 * measured is the kind of invented number this package exists to refuse.
 *
 * ## The declared markdown face
 * A Role declares its markdown face as **data**, not as a function that returns a string. That
 * is deliberate: a face that cannot author bytes cannot invent a value. The face chooses shape
 * (list or table), heading depth, the declared key order, and the label a key renders under —
 * and nothing else. Values are serialized in exactly one place ({@link renderGlyph}), so the
 * markdown face and every other face print the same text or the parity assertion fails.
 *
 * A Role with no declared markdown face cannot be registered. That is requirement R2.1 of the
 * vis agent-legible-views ruling, enforced at registration instead of at review time.
 *
 * @packageDocumentation
 */

import { UnknownIdError } from './errors.js'
import { assertAddressable } from './frame.js'
import { isBlank } from './field.js'

/** How a Role's markdown face lays its Fields out. Shape only — never appearance. */
export type MarkdownFaceKind = 'list' | 'table'

/**
 * A Role's declared markdown face. Declarative by construction: it selects structure, never
 * content. There is no escape hatch that lets a face emit a string of its own choosing, because
 * that escape hatch is exactly how a face invents a value.
 */
export interface MarkdownFace {
  /** `list` — one `- **label**: value` line per Field. `table` — a GFM table over the Role's rows. */
  readonly kind: MarkdownFaceKind
  /** Heading depth for the Role's title. Document structure, not appearance. Default 2. */
  readonly heading?: 1 | 2 | 3 | 4 | 5 | 6
  /**
   * The declared column order for a `table` face, and the declared key order for a `list` face.
   * **Required, and exhaustive.** The Frame's key set for this Role must equal this set exactly:
   * a declared key with no Field is a defect (not an absence — absence is a Field), and a Field no
   * declared key covers is a value the Frame carries that no face will show.
   *
   * It is exhaustive rather than a subset on purpose. Absent-not-hidden is structural here: a
   * value that exists but is not licensed for this vantage is a `withheld` Field that renders, and
   * a face permitted to drop declared keys would give an author a second, silent way to make a
   * value disappear — one that carries no licence class and leaves no mark in any face.
   *
   * Column subsetting for token economy (R2.3) is therefore NOT available today. It is worth
   * having and it is deferred, because it is a degradation lever and the degradation ladder
   * (R4.2) is an open owner question — see `dot-do/vis#361`. Declare a second, narrower Role
   * meanwhile; that costs an id and stays honest.
   */
  readonly keys: readonly string[]
  /** Key → human label. A rename, never a value transform. */
  readonly labels?: Readonly<Record<string, string>>
  /**
   * Where the provenance mark goes in a `table` face. `inline` (default) repeats it in every
   * cell; `legend` factors it to one line under the table for each column whose cells all share
   * the same mark, and leaves the rest inline. A column is never silently un-marked: the mark
   * moves, it does not disappear, and the canonical glyph each face is held to is unchanged
   * either way — which the sink reconciliation in `render.ts` now checks against the actual
   * bytes rather than taking on trust.
   */
  readonly provenance?: 'inline' | 'legend'
}

/** One addressable block of a View: an id, a title, and its declared markdown face. */
export interface RoleSpec {
  /** The stable, documented, agent-addressable id. */
  readonly id: string
  /** The Role's title, as text. Not a style. */
  readonly title: string
  /** The declared markdown face. Required — see the module note. */
  readonly markdown: MarkdownFace
  /** One line describing what the Role answers, for the id listing an agent reads. */
  readonly describe?: string
}

/** The standing definition: which Roles, at what token budget per face, addressed by id. */
export interface View {
  readonly id: string
  /** Role ids, in render order. Every one must be registered, and no id twice. */
  readonly roles: readonly string[]
  /**
   * The token budget for each face, keyed by the face's format (`markdown`, `data`, whatever a
   * sink calls itself), counted by the Rendering's declared tokenizer. Exceeding it throws; a
   * face with no entry here cannot be rendered at all. `markdown` is required. There is no
   * truncation. See the module note for why this is a map.
   */
  readonly budgets: Readonly<Record<string, number>>
  readonly describe?: string
}

/**
 * A registry of Roles and Views. Immutable once built: `register*` returns a new registry, so a
 * registry cannot be mutated out from under a Rendering in flight.
 *
 * The constructor is **private**, and that is load-bearing rather than stylistic. A public
 * constructor taking two Maps was a documented immutability guarantee with a public bypass: it
 * skipped every check `withRoles`/`withViews` perform (a Role with no markdown face, a View
 * naming an unregistered Role, a non-positive budget), and it retained the caller's Maps BY
 * REFERENCE — so a caller could hold onto its Map and add a Role mid-render, which is the exact
 * mutation the class docstring promised was impossible. Both are closed: build with
 * {@link createRegistry}, and every Map is copied on the way in.
 */
export class ViewRegistry {
  private readonly rolesById: ReadonlyMap<string, RoleSpec>
  private readonly viewsById: ReadonlyMap<string, View>

  private constructor(roles: ReadonlyMap<string, RoleSpec>, views: ReadonlyMap<string, View>) {
    this.rolesById = new Map(roles)
    this.viewsById = new Map(views)
  }

  /** The one entry point: an empty registry to build from. */
  static empty(): ViewRegistry {
    return new ViewRegistry(new Map(), new Map())
  }

  /** Every registered Role id, sorted — the list an agent reads to know what it may select. */
  get roleIds(): string[] {
    return [...this.rolesById.keys()].sort()
  }

  /** Every registered View id, sorted. */
  get viewIds(): string[] {
    return [...this.viewsById.keys()].sort()
  }

  /**
   * Add Roles. Refuses a Role with no id, an id that would break path injectivity, no title, no
   * declared markdown face, no declared keys, or a duplicate key in its declared key set — a
   * duplicate key emits the same Field twice, which parity reports as an invented value against a
   * Frame that is fine.
   */
  withRoles(...roles: readonly RoleSpec[]): ViewRegistry {
    const next = new Map(this.rolesById)
    for (const role of roles) {
      assertAddressable('Role id', role.id)
      if (role.title === undefined || isBlank(role.title)) {
        throw new TypeError(`Role ${JSON.stringify(role.id)} declares no title — the title is what a face names the block by`)
      }
      if (role.markdown === undefined || role.markdown === null) {
        throw new TypeError(
          `Role ${JSON.stringify(role.id)} declares no markdown face — a Role with no markdown face cannot be placed in an agent-servable View`
        )
      }
      if (role.markdown.kind !== 'list' && role.markdown.kind !== 'table') {
        throw new TypeError(`Role ${JSON.stringify(role.id)} declares an unknown markdown face kind ${JSON.stringify(role.markdown.kind)}`)
      }
      if (!Array.isArray(role.markdown.keys) || role.markdown.keys.length === 0) {
        throw new TypeError(
          `Role ${JSON.stringify(role.id)} declares no keys — a face declares the exact key set it shows, so that a value the Frame carries can never be silently absent from it`
        )
      }
      const keys = new Set<string>()
      for (const key of role.markdown.keys) {
        assertAddressable(`Field key in Role ${JSON.stringify(role.id)}`, key)
        if (keys.has(key)) throw new TypeError(`Role ${JSON.stringify(role.id)} declares key ${JSON.stringify(key)} twice — a key emitted twice is an invented value to face parity`)
        keys.add(key)
      }
      next.set(role.id, role)
    }
    return new ViewRegistry(next, this.viewsById)
  }

  /**
   * Add Views. FAILS CLOSED at registration on an empty id, an empty or duplicated Role list, a
   * Role id the registry does not hold, and a budget map that is missing, empty, missing its
   * required `markdown` entry, or carrying a non-positive / non-finite number: an unresolvable
   * View never becomes addressable in the first place.
   */
  withViews(...views: readonly View[]): ViewRegistry {
    const next = new Map(this.viewsById)
    for (const view of views) {
      if (view.id === undefined || isBlank(view.id)) throw new TypeError('a View with an empty id cannot be addressed')
      if (view.roles.length === 0) {
        throw new TypeError(`View ${JSON.stringify(view.id)} selects no Roles — a View that shows nothing is a View no face can disagree about`)
      }
      const seen = new Set<string>()
      for (const roleId of view.roles) {
        if (seen.has(roleId)) throw new TypeError(`View ${JSON.stringify(view.id)} selects Role ${JSON.stringify(roleId)} twice — the Role would be emitted twice and parity would call it invented`)
        seen.add(roleId)
        if (!this.rolesById.has(roleId)) throw new UnknownIdError('role', roleId, this.roleIds)
      }
      assertBudgets(view)
      next.set(view.id, view)
    }
    return new ViewRegistry(this.rolesById, next)
  }

  /** Resolve a Role id, or throw an {@link UnknownIdError} carrying every known Role id. */
  role(id: string): RoleSpec {
    const found = this.rolesById.get(id)
    if (found === undefined) throw new UnknownIdError('role', id, this.roleIds)
    return found
  }

  /** Resolve a View id, or throw an {@link UnknownIdError} carrying every known View id. */
  view(id: string): View {
    const found = this.viewsById.get(id)
    if (found === undefined) throw new UnknownIdError('view', id, this.viewIds)
    return found
  }

  /** The Role specs a View selects, in the View's declared order. Fails closed on any unknown id. */
  rolesOf(view: View): RoleSpec[] {
    return view.roles.map((id) => this.role(id))
  }
}

/** The `Number.isFinite(b) && b > 0` contract every budget is held to, in one place. */
export function isHonestBudget(budget: unknown): budget is number {
  return typeof budget === 'number' && Number.isFinite(budget) && budget > 0
}

function assertBudgets(view: View): void {
  const budgets = view.budgets as Record<string, unknown> | undefined
  if (budgets === undefined || budgets === null || typeof budgets !== 'object') {
    throw new TypeError(`View ${JSON.stringify(view.id)} declares no budgets — a View's token budget is a map keyed by face format, with a required "markdown" entry`)
  }
  if (!('markdown' in budgets)) {
    throw new TypeError(`View ${JSON.stringify(view.id)} declares no "markdown" budget — every Role has a markdown face, so every View has a markdown budget`)
  }
  for (const [format, budget] of Object.entries(budgets)) {
    if (!isHonestBudget(budget)) {
      throw new TypeError(
        `View ${JSON.stringify(view.id)} declares a budget of ${String(budget)} for face ${JSON.stringify(format)} — a View's token budget must be a positive, finite number`
      )
    }
  }
}

/** An empty registry to build from. */
export function createRegistry(): ViewRegistry {
  return ViewRegistry.empty()
}
