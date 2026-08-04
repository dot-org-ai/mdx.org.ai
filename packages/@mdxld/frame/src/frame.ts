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
 * @packageDocumentation
 */

import { FrameError } from './errors.js'
import { assertFieldHonest, isField, type AsOf, type Field } from './field.js'

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

/** One named block of a Frame: its scalar Fields and, optionally, its rows. */
export interface RoleFrame {
  /** The Role id. Must be one the View selected and the registry declares. */
  readonly role: string
  /** The Role's scalar Fields, in emission order. */
  readonly fields?: FieldMap
  /** The Role's repeated records (a register, a ledger, a line-item list), in emission order. */
  readonly rows?: readonly FieldMap[]
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
 * Every Field in the Frame, in canonical order (Roles in View order; within a Role, scalars in
 * key-insertion order, then rows in index order and cells in key-insertion order). This is the
 * ONE traversal — every face walks it, so completeness is a structural property rather than a
 * discipline each face has to remember.
 */
export function walkFrame(frame: Frame): PathedField[] {
  const out: PathedField[] = []
  for (const role of frame.roles) {
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

/**
 * Assemble a Frame, refusing a malformed one. Checks: unique Role ids; every leaf is
 * structurally a Field; every Field passes {@link assertFieldHonest}.
 *
 * The honesty re-check is the point of doing this here. A Field constructed through
 * {@link makeField} was already checked, but a Field that arrived over the wire as JSON never
 * met a constructor — and a Frame is exactly where such values enter. Refusing at assembly means
 * no dishonest value ever reaches a Rendering, whatever route it took in.
 */
export function makeFrame(spec: Frame): Frame {
  const seen = new Set<string>()
  for (const role of spec.roles) {
    if (role.role.trim() === '') throw new FrameError('a Role with an empty id cannot be addressed')
    if (seen.has(role.role)) throw new FrameError(`duplicate Role id ${JSON.stringify(role.role)} in Frame for View ${JSON.stringify(spec.view)}`)
    seen.add(role.role)
  }
  if (spec.snapshot.token.trim() === '') {
    throw new FrameError('a Frame carries a snapshot token — the moment it was materialised must be nameable')
  }

  for (const role of spec.roles) {
    for (const [key, value] of Object.entries(role.fields ?? {})) {
      const path = scalarPath(role.role, key)
      if (!isField(value)) throw new FrameError(`${path} is not a Field — every leaf of a Frame is a Field, never a naked value`)
      assertFieldHonest(value, path)
    }
    const rows = role.rows ?? []
    for (let i = 0; i < rows.length; i++) {
      for (const [key, value] of Object.entries(rows[i] as FieldMap)) {
        const path = cellPath(role.role, i, key)
        if (!isField(value)) throw new FrameError(`${path} is not a Field — every leaf of a Frame is a Field, never a naked value`)
        assertFieldHonest(value, path)
      }
    }
  }
  return spec
}
