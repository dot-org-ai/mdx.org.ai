/**
 * # cli/orient — the bare-invocation ORIENTATION
 *
 * Modelled on kestrel (`kestrel.markets` `src/cli/commands/orient.ts`, MIT, © 2026 Nathan
 * Clevenger; ADR-0035 §c) for mdxe by mdx-8je.16.
 *
 * `mdxe` with NO args renders neither the generic help nor an alphabetical command dump — and it
 * NEVER starts the dev server (the previous default), because a wrongly-launched server blocks an
 * automated harness forever. It renders an **orientation**: what mdxe is, its commands **grouped by
 * task** (*develop · test · build & serve · deploy & observe · data*), and where to go next.
 * `mdxe help` / `--help` still print the full usage (help is NOT the orientation); the orientation
 * points AT them.
 *
 * ## Same content, two Renderings
 * An agent / CI / pipe gets the orientation as static `text` (or `json`) and moves on — exit 0, no
 * stdin read, no network, no heavy import. A confident human gets the *same* orientation as the
 * opening view (today: the static orientation with a one-line banner; the interactive session is a
 * later phase of the epic — mdx-8je.13/.14/.15 — so this ships the orientation both ways without
 * pretending the TUI exists yet).
 *
 * LIGHT by construction: node built-ins only. This module must never import a runtime.
 */

import type { Caller } from './caller.js'
import type { OutputCtx } from './context.js'

/** One command line of the orientation: the verb and a one-line purpose. */
export interface OrientCommand {
  readonly verb: string
  readonly purpose: string
}

/** Commands grouped by the task a caller is trying to do — never an alphabetical dump. */
export interface TaskGroup {
  readonly task: string
  readonly commands: readonly OrientCommand[]
}

/**
 * The task groups, in the order a newcomer meets them. Every verb the router dispatches appears
 * exactly once (pinned by `orient.test.ts` against `cli.ts`'s command union).
 */
export const TASK_GROUPS: readonly TaskGroup[] = Object.freeze([
  {
    task: 'develop',
    commands: [
      { verb: 'dev', purpose: 'start the local dev server (Miniflare host worker)' },
      { verb: 'notebook', purpose: 'open an interactive notebook over MDX files' },
    ],
  },
  {
    task: 'test',
    commands: [
      { verb: 'test', purpose: 'run the ```ts test blocks in your MDX files' },
      { verb: 'run', purpose: 'execute the ```ts script blocks in one MDX file' },
    ],
  },
  {
    task: 'build & serve',
    commands: [
      { verb: 'build', purpose: 'build for production' },
      { verb: 'start', purpose: 'serve the production build' },
    ],
  },
  {
    task: 'deploy & observe',
    commands: [
      { verb: 'deploy', purpose: 'deploy to the .do platform or Cloudflare' },
      { verb: 'tail', purpose: 'stream or fetch events from a deployed app' },
    ],
  },
  {
    task: 'data',
    commands: [
      { verb: 'db', purpose: 'local data environment (ClickHouse + sync + UI)' },
      { verb: 'db:server', purpose: 'start only the ClickHouse server' },
      { verb: 'db:client', purpose: 'open a ClickHouse client shell' },
      { verb: 'db:publish', purpose: 'publish MDX files to a database' },
      { verb: 'admin', purpose: 'Payload admin UI over the mdxdb backend' },
    ],
  },
])

/** The orientation as a CONTRACT OBJECT — scalars only, never pre-rendered text. */
export interface Orientation {
  readonly name: 'mdxe'
  readonly version: string
  readonly tagline: string
  readonly caller: { readonly kind: Caller['kind']; readonly harness: string | null; readonly detectedBy: Caller['detectedBy'] }
  readonly groups: readonly TaskGroup[]
  /** Where to go next — the orientation points AT help; it is not the help. */
  readonly next: readonly string[]
}

export const TAGLINE = 'Execute, Test, & Deploy MDX-based Agents, Apps, APIs, and Sites'

/** Build the orientation object. Pure: no clock, no I/O. */
export function buildOrientation(version: string, caller: Caller): Orientation {
  return Object.freeze({
    name: 'mdxe',
    version,
    tagline: TAGLINE,
    caller: { kind: caller.kind, harness: caller.harness, detectedBy: caller.detectedBy },
    groups: TASK_GROUPS,
    next: ['mdxe help', 'mdxe <command> --help', 'mdxe dev'],
  })
}

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

/**
 * Render the orientation in the ctx's mode. `text` is TSV-shaped lines (token-cheap, greppable);
 * `json` is the contract object verbatim; `human` is an aligned, optionally coloured view. The DATA
 * is identical across all three.
 */
export function renderOrientation(o: Orientation, ctx: OutputCtx, caller: Caller): string {
  if (ctx.mode === 'json') return JSON.stringify(o) + '\n'

  if (ctx.mode === 'text') {
    const lines: string[] = []
    lines.push(`mdxe\tversion=${o.version}\tcaller=${o.caller.kind}\tdetected=${o.caller.detectedBy}`)
    lines.push(`tagline\t${o.tagline}`)
    for (const g of o.groups) {
      for (const c of g.commands) lines.push(`command\t${g.task}\t${c.verb}\t${c.purpose}`)
    }
    for (const n of o.next) lines.push(`next\t${n}`)
    return lines.join('\n') + '\n'
  }

  // human
  const b = (s: string): string => (ctx.color ? `${BOLD}${s}${RESET}` : s)
  const d = (s: string): string => (ctx.color ? `${DIM}${s}${RESET}` : s)
  const verbWidth = Math.max(...o.groups.flatMap((g) => g.commands.map((c) => c.verb.length)))
  const lines: string[] = []
  lines.push(`${b(`mdxe ${o.version}`)} ${d('—')} ${o.tagline}`)
  if (caller.interactive) lines.push(d('opening view · the interactive session lands with the text/TUI seam'))
  lines.push('')
  for (const g of o.groups) {
    lines.push(b(g.task))
    for (const c of g.commands) lines.push(`  ${c.verb.padEnd(verbWidth)}  ${d(c.purpose)}`)
    lines.push('')
  }
  lines.push(`${b('next')}  ${o.next.join(d('  ·  '))}`)
  return lines.join('\n') + '\n'
}

/** A stdout-shaped sink; injectable for tests. */
export interface OutSink {
  write(chunk: string): unknown
}

/**
 * The bare-invocation command. Writes the orientation to stdout (a pure payload — nothing else
 * touches stdout), reads NOTHING from stdin, and returns exit 0. Synchronous, so it can never be
 * left pending by a harness waiting on a stream.
 */
export function orientCommand(ctx: OutputCtx, caller: Caller, version: string, out: OutSink = process.stdout): number {
  out.write(renderOrientation(buildOrientation(version, caller), ctx, caller))
  return 0
}
