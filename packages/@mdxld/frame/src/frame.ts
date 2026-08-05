/**
 * # Frame — a View materialised at one moment
 *
 * A Frame is the typed bundle of {@link Field}s that a {@link View} selected, captured at one
 * instant and stamped with the snapshot token that identifies that instant. **The Frame invents
 * nothing**: it is assembled from values that already exist, each carrying the provenance it was
 * derived under, and a value that is unavailable is an explicit absent Field rather than a hole.
 *
 * A Frame is organised into **Roles**. A Role is one named block of the Frame (kestrel calls it a
 * Pane; this package uses Role because the same block also names the markdown face and the
 * agent-addressable id). A Role holds scalar Fields, repeated rows of Fields, or both.
 *
 * Every Field in a Frame has a canonical **path** — `role.key` for a scalar, `role[i].key` for a
 * row cell. Paths are the addresses the face-parity assertion compares, so they are stable and
 * derived, never hand-written.
 *
 * ## Paths are injective, and that has to be enforced
 * `role.key` is a JOIN, and a join over an unrestricted alphabet is not injective. Role `x` with
 * key `y.z` and role `x.y` with key `z` both address `x.y.z`; a role literally named `lines[0]`
 * collides with row 0 of a role named `lines`. The consequences are worse than a cosmetic clash:
 * two Fields at one address silently MERGE in every by-path index (parity's, the data face's),
 * and the parity assertion then reports a breach on a Frame that is perfectly well formed. So
 * {@link makeFrame} refuses `.`, `[` and `]` in a Role id or a Field key. Naming is cheap;
 * un-inventing a merged value is not.
 *
 * @packageDocumentation
 */

import { FrameError } from './errors.js'
import { assertFieldHonest, deepFreeze, isBlank, isField, type AsOf, type Field } from './field.js'

/** A map of Field keys to Fields — a Role's scalars, or one row of a Role's rows. */
export type FieldMap = Readonly<Record<string, Field<unknown>>>

/**
 * The moment a Frame was materialised. `token` is an opaque cursor into whatever the caller's
 * record actually is (an event-log sequence, a content hash, a database snapshot id); `asOf` is
 * the stamp for the Frame as a whole. Individual Fields carry their own, older, `asOf` stamps —
 * the Frame's is when this bundle was assembled, not when each value was derived.
 */
export interface SnapshotToken {
  readonly token: string
  readonly asOf: AsOf
}

/** The four states a Role can be in. R1.5's `OK | EMPTY | BLOCKED` envelope, plus `loading`. */
export type RoleStateKind = 'ok' | 'empty' | 'blocked' | 'loading'

/**
 * A Role's state, as DATA. Requirement R1.5: a face that collapses BLOCKED into empty fails
 * conformance — and it will collapse them if the only thing distinguishing "no rows because
 * nothing matched" from "no rows because the upstream call was refused" is that the renderer
 * happened to print different English. So the state is a declared enum on the Frame, and the
 * sentence explaining it is a {@link Field} like every other value: it carries its own
 * provenance, it walks with the Frame, and face parity holds every face to it.
 *
 * That is also why the markdown sink no longer authors `_(no rows)_`. Renderer-authored English
 * inside a generic package is a value the Frame never supplied.
 */
export interface RoleState {
  readonly kind: RoleStateKind
  /** The sentence explaining the state. A Field, so it is attributable and parity-checked. */
  readonly sentence?: Field<string>
}

/** The key a Role's state sentence is addressed under: `role.$state`. */
export const STATE_KEY = '$state'

/** One named block of a Frame: its scalar Fields and, optionally, its rows. */
export interface RoleFrame {
  /** The Role id. Must be one the View selected and the registry declares. */
  readonly role: string
  /** The Role's scalar Fields, in emission order. */
  readonly fields?: FieldMap
  /** The Role's repeated records (a register, a ledger, a line-item list), in emission order. */
  readonly rows?: readonly FieldMap[]
  /** The Role's declared state. Absent means the Role makes no claim about its own state. */
  readonly state?: RoleState
}

/** A View materialised at one moment. */
export interface Frame {
  /** The id of the View this Frame materialises. */
  readonly view: string
  readonly snapshot: SnapshotToken
  /** The Roles, in the order the View declared them. */
  readonly roles: readonly RoleFrame[]
}

/** The canonical path of a scalar Field. */
export function scalarPath(role: string, key: string): string {
  return `${role}.${key}`
}

/** The canonical path of a row cell. */
export function cellPath(role: string, index: number, key: string): string {
  return `${role}[${index}].${key}`
}

/** The characters that would make a path ambiguous. See the module note. */
const PATH_SEPARATORS = /[.[\]]/

/**
 * Refuse an id or key that would break path injectivity. Exported because {@link ViewRegistry}
 * enforces the same rule at registration, on the same alphabet.
 */
export function assertAddressable(kind: string, name: string): void {
  if (isBlank(name)) throw new FrameError(`a ${kind} with an empty name cannot be addressed`)
  if (PATH_SEPARATORS.test(name)) {
    throw new FrameError(
      `${kind} ${JSON.stringify(name)} contains one of . [ ] — a Field path is built by joining a Role id and a key, so those characters make two different Fields share one address`
    )
  }
}

/** One Field with its canonical path, in Frame order. */
export interface PathedField {
  readonly path: string
  readonly role: string
  readonly key: string
  /** The row index, for a row cell; absent for a scalar. */
  readonly row?: number
  readonly field: Field<unknown>
}

/**
 * Every Field in the Frame, in canonical order (Roles in View order; within a Role, the state
 * sentence if it has one, then scalars in key-insertion order, then rows in index order and cells
 * in key-insertion order). This is the ONE traversal — every face walks it, so completeness is a
 * structural property rather than a discipline each face has to remember.
 */
export function walkFrame(frame: Frame): PathedField[] {
  const out: PathedField[] = []
  for (const role of frame.roles) {
    const sentence = role.state?.sentence
    if (sentence !== undefined) {
      out.push({ path: scalarPath(role.role, STATE_KEY), role: role.role, key: STATE_KEY, field: sentence })
    }
    for (const [key, field] of Object.entries(role.fields ?? {})) {
      out.push({ path: scalarPath(role.role, key), role: role.role, key, field })
    }
    const rows = role.rows ?? []
    for (let i = 0; i < rows.length; i++) {
      for (const [key, field] of Object.entries(rows[i] as FieldMap)) {
        out.push({ path: cellPath(role.role, i, key), role: role.role, key, row: i, field })
      }
    }
  }
  return out
}

/** Every canonical Field path in the Frame, in canonical order. */
export function framePaths(frame: Frame): string[] {
  return walkFrame(frame).map((p) => p.path)
}

const ROLE_STATE_KINDS: readonly RoleStateKind[] = ['ok', 'empty', 'blocked', 'loading']

/**
 * Assemble a Frame, refusing a malformed one. Checks: unique Role ids; addressable Role ids and
 * keys (see the module note on injectivity); a declared state whose kind is one of the four; at
 * least one Field somewhere; every leaf structurally a Field; every Field passing
 * {@link assertFieldHonest}.
 *
 * The honesty re-check is the point of doing this here. A Field constructed through
 * {@link makeField} was already checked, but a Field that arrived over the wire as JSON never
 * met a constructor — and a Frame is exactly where such values enter. Refusing at assembly means
 * no dishonest value ever reaches a Rendering, whatever route it took in.
 *
 * A Frame with **no Fields at all** is refused too, and that one is about the parity assertion
 * rather than about the Frame: parity is a statement over the Frame's paths, so over zero paths
 * it is vacuously true. A green `assertFaceParity` on an empty Frame is the assertion reporting
 * that it had nothing to check, in the voice it uses to report that everything agreed.
 *
 * Returns a deep-frozen Frame. A Frame that can be edited after assembly was never validated —
 * the honesty guard would be a checkpoint rather than a wall.
 */
export function makeFrame(spec: Frame): Frame {
  if (isBlank(spec.view)) throw new FrameError('a Frame names the View it materialises')
  if (isBlank(spec.snapshot.token)) {
    throw new FrameError('a Frame carries a snapshot token — the moment it was materialised must be nameable')
  }

  const seen = new Set<string>()
  for (const role of spec.roles) {
    assertAddressable('Role id', role.role)
    if (seen.has(role.role)) throw new FrameError(`duplicate Role id ${JSON.stringify(role.role)} in Frame for View ${JSON.stringify(spec.view)}`)
    seen.add(role.role)
  }

  const roles: RoleFrame[] = []
  for (const role of spec.roles) {
    const state = role.state
    if (state !== undefined) {
      if (!ROLE_STATE_KINDS.includes(state.kind)) {
        throw new FrameError(`Role ${JSON.stringify(role.role)} declares state kind ${JSON.stringify(state.kind)} — one of ${ROLE_STATE_KINDS.join(', ')}`)
      }
      if (state.sentence !== undefined) {
        const path = scalarPath(role.role, STATE_KEY)
        if (!isField(state.sentence)) throw new FrameError(`${path} is not a Field — a Role's state sentence carries its provenance like every other value`)
        assertFieldHonest(state.sentence, path)
      }
    }

    const fields = role.fields
    if (fields !== undefined) {
      for (const [key, value] of Object.entries(fields)) {
        assertAddressable(`Field key in Role ${JSON.stringify(role.role)}`, key)
        const path = scalarPath(role.role, key)
        if (!isField(value)) throw new FrameError(`${path} is not a Field — every leaf of a Frame is a Field, never a naked value`)
        assertFieldHonest(value, path)
      }
    }

    const rows = role.rows
    if (rows !== undefined) {
      for (let i = 0; i < rows.length; i++) {
        for (const [key, value] of Object.entries(rows[i] as FieldMap)) {
          assertAddressable(`Field key in Role ${JSON.stringify(role.role)}`, key)
          const path = cellPath(role.role, i, key)
          if (!isField(value)) throw new FrameError(`${path} is not a Field — every leaf of a Frame is a Field, never a naked value`)
          assertFieldHonest(value, path)
        }
      }
    }

    const copied: { role: string; fields?: FieldMap; rows?: readonly FieldMap[]; state?: RoleState } = { role: role.role }
    if (fields !== undefined) copied.fields = { ...fields }
    if (rows !== undefined) copied.rows = rows.map((row) => ({ ...row }))
    if (state !== undefined) copied.state = state.sentence === undefined ? { kind: state.kind } : { kind: state.kind, sentence: state.sentence }
    roles.push(copied)
  }

  const frame: Frame = { view: spec.view, snapshot: { token: spec.snapshot.token, asOf: spec.snapshot.asOf }, roles }
  if (walkFrame(frame).length === 0) {
    throw new FrameError(
      `Frame for View ${JSON.stringify(spec.view)} carries no Fields — face parity is a statement over the Frame's paths, and over zero paths it passes without checking anything`
    )
  }
  return deepFreeze(frame)
}
