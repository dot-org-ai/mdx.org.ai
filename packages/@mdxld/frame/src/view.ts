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
 * ## The declared markdown face
 * A Role declares its markdown face as **data**, not as a function that returns a string. That
 * is deliberate: a face that cannot author bytes cannot invent a value. The face chooses shape
 * (list or table), heading depth, the declared column order and subset, and the label a key
 * renders under — and nothing else. Values are serialized in exactly one place
 * ({@link renderGlyph}), so the markdown face and every other face print the same text or the
 * parity assertion fails.
 *
 * A Role with no declared markdown face cannot be registered. That is requirement R2.1 of the
 * vis agent-legible-views ruling, enforced at registration instead of at review time.
 *
 * @packageDocumentation
 */

import { UnknownIdError } from './errors.js'

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
   * A subset is allowed — column subsetting for token economy is legitimate — but it must be
   * DECLARED here, so it is identical on every render and visible to the parity assertion, which
   * holds every face to the same declared set.
   */
  readonly keys?: readonly string[]
  /** Key → human label. A rename, never a value transform. */
  readonly labels?: Readonly<Record<string, string>>
  /**
   * Where the provenance mark goes in a `table` face. `inline` (default) repeats it in every
   * cell; `legend` factors it to one line under the table for each column whose cells all share
   * the same mark, and leaves the rest inline. A column is never silently un-marked: the mark
   * moves, it does not disappear, and the canonical glyph each face is held to is unchanged
   * either way.
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

/** The standing definition: which Roles, at what token budget, addressed by id. */
export interface View {
  readonly id: string
  /** Role ids, in render order. Every one must be registered. */
  readonly roles: readonly string[]
  /**
   * The token budget for a Rendering of this View, counted by the Rendering's declared
   * tokenizer. Exceeding it throws. There is no truncation.
   */
  readonly budget: number
  readonly describe?: string
}

/**
 * A registry of Roles and Views. Immutable once built: `register*` returns a new registry, so a
 * registry cannot be mutated out from under a Rendering in flight.
 */
export class ViewRegistry {
  private readonly rolesById: ReadonlyMap<string, RoleSpec>
  private readonly viewsById: ReadonlyMap<string, View>

  constructor(roles: ReadonlyMap<string, RoleSpec> = new Map(), views: ReadonlyMap<string, View> = new Map()) {
    this.rolesById = roles
    this.viewsById = views
  }

  /** Every registered Role id, sorted — the list an agent reads to know what it may select. */
  get roleIds(): string[] {
    return [...this.rolesById.keys()].sort()
  }

  /** Every registered View id, sorted. */
  get viewIds(): string[] {
    return [...this.viewsById.keys()].sort()
  }

  /** Add Roles. Refuses a Role with no id, no title or no declared markdown face. */
  withRoles(...roles: readonly RoleSpec[]): ViewRegistry {
    const next = new Map(this.rolesById)
    for (const role of roles) {
      if (role.id.trim() === '') throw new UnknownIdError('role', role.id, this.roleIds)
      if (role.markdown === undefined || role.markdown === null) {
        throw new TypeError(
          `Role ${JSON.stringify(role.id)} declares no markdown face — a Role with no markdown face cannot be placed in an agent-servable View`
        )
      }
      if (role.markdown.kind !== 'list' && role.markdown.kind !== 'table') {
        throw new TypeError(`Role ${JSON.stringify(role.id)} declares an unknown markdown face kind ${JSON.stringify(role.markdown.kind)}`)
      }
      next.set(role.id, role)
    }
    return new ViewRegistry(next, this.viewsById)
  }

  /**
   * Add Views. FAILS CLOSED at registration on a Role id the registry does not hold, and on a
   * non-positive budget: an unresolvable View never becomes addressable in the first place.
   */
  withViews(...views: readonly View[]): ViewRegistry {
    const next = new Map(this.viewsById)
    for (const view of views) {
      if (!Number.isFinite(view.budget) || view.budget <= 0) {
        throw new TypeError(`View ${JSON.stringify(view.id)} declares a budget of ${view.budget} — a View's token budget must be a positive, finite number`)
      }
      for (const roleId of view.roles) {
        if (!this.rolesById.has(roleId)) throw new UnknownIdError('role', roleId, this.roleIds)
      }
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

/** An empty registry to build from. */
export function createRegistry(): ViewRegistry {
  return new ViewRegistry()
}
