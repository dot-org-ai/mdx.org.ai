/**
 * # cli/context — the one capability resolver
 *
 * Ported from kestrel (`kestrel.markets` `src/cli/context.ts`, MIT, © 2026 Nathan Clevenger) into
 * mdxe by mdx-8je.16, with the repo-specific env names renamed (`KESTREL_AGENT` → `MDXE_AGENT`,
 * `KESTREL_COLOR` → `MDXE_COLOR`) and one extra rung — an HTTP face's `Accept` header — so the CLI
 * and the served text registers (@mdxe/hono, mdx-8je.18) resolve their format from ONE ladder.
 *
 * `resolveOutputCtx` is the single place that decides HOW output renders. It is called **exactly
 * once** in `src/cli.ts` `main` before dispatch; the frozen {@link OutputCtx} it returns is threaded
 * to every command handler (`CliOptions.ctx`). Nothing downstream re-probes `isTTY` — the golden rule
 * is enforced structurally: this resolver returns only rendering knobs, so the same inputs produce
 * the same data and the same exit code across all three modes.
 *
 * Pure + deterministic: it reads its `flags`/`env`/`streams` arguments, never `process` directly,
 * so it is trivially unit-testable (see `src/cli/context.test.ts`). No heavy imports.
 */

import { usageError } from './errors.js'

/** The three rendering skins. `human` = colored/aligned TTY; `text` = plain TSV/lines (agent
 * default, token-cheap); `json` = deterministic machine JSON. Data is identical across all three. */
export type RenderMode = 'human' | 'text' | 'json'
export const RENDER_MODES = ['human', 'text', 'json'] as const satisfies readonly RenderMode[]

/** The frozen rendering context every command reads instead of probing the terminal. */
export interface OutputCtx {
  readonly mode: RenderMode
  readonly color: boolean
  /** Columns; `Infinity` when non-TTY/machine (never wrap/truncate machine output). */
  readonly width: number
  /** May prompt (both stdin+stdout TTY, not CI/agent). */
  readonly interactive: boolean
  /** May animate/spinner (stdout TTY, not CI/agent). */
  readonly stream: boolean
}

/**
 * The minimal machine-safe context: plain text, no color, never interactive. The context every
 * command receives when resolution itself failed (a bad `--format`), and the default a command gets
 * when constructed outside `main` — under ANY ambiguity, behave as if piped.
 */
export const FAILSAFE_CTX: OutputCtx = Object.freeze({
  mode: 'text',
  color: false,
  width: Infinity,
  interactive: false,
  stream: false,
})

export interface Env {
  readonly [k: string]: string | undefined
}

export interface Streams {
  readonly stdinTTY: boolean
  readonly stdoutTTY: boolean
  readonly columns?: number
}

/** The global rendering flags parsed by `./args.ts` and stripped before command parsing. */
export interface GlobalFlags {
  readonly json?: boolean
  readonly format?: string
  readonly agent?: boolean
  readonly color?: string
  readonly noColor?: boolean
  /**
   * HTTP faces ONLY: the request's `Accept` header value. The CLI never sets it. Sits in the ladder
   * below an explicit `--format` and above the agent env markers, so a served register resolves
   * its format from the same resolver the CLI uses. See {@link modeFromAccept}.
   */
  readonly accept?: string
}

/** A marker counts when NON-EMPTY (any value, including "0") — the SAME value semantics as
 * `resolveCaller`'s agent-env table (`./caller.ts` `detectAgentEnv`), so the two resolvers can never
 * disagree about whether `MDXE_AGENT`/`AGENT` is set. Non-empty (not `=== "1"`) is the fail-closed
 * reading: a weird value (`AGENT=true`) resolves toward machine output, never toward an interactive
 * surface (under any ambiguity, non-interactive). */
function isSet(v: string | undefined): boolean {
  return v !== undefined && v !== ''
}

/**
 * The render mode an HTTP `Accept` header asks for, or `null` when it names nothing this resolver
 * renders (the ladder then falls through to the env/stream rungs — the HTTP face decides separately
 * whether an unrecognised register is a 406, mdx-8je.18). Only the first, highest-listed media
 * range is read; parameters (`;q=`) are ignored. `application/json` (and any `+json` structured
 * syntax) → `json`; `text/plain` / `text/markdown` → `text`; `text/html` → `human` (the browser is
 * the human skin); the wildcard range (star-slash-star) → `null` (no preference expressed).
 */
export function modeFromAccept(accept: string | undefined): RenderMode | null {
  if (accept === undefined) return null
  const first = accept.split(',')[0]?.trim().split(';')[0]?.trim().toLowerCase() ?? ''
  if (first === '' || first === '*/*') return null
  if (first === 'application/json' || first.endsWith('+json')) return 'json'
  if (first === 'text/plain' || first === 'text/markdown') return 'text'
  if (first === 'text/html') return 'human'
  return null
}

/**
 * Resolve the frozen render context. Precedence for **mode**: explicit `--json`/`--format` >
 * `Accept` (HTTP faces) > `--agent`/agent env > CI > piped (non-TTY) > TTY probe (human). Color,
 * width, interactivity, and streaming are derived independently.
 */
export function resolveOutputCtx(flags: GlobalFlags, env: Env, s: Streams): OutputCtx {
  const isCI = !!(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.GITLAB_CI)
  const agent = flags.agent === true || isSet(env.MDXE_AGENT) || isSet(env.AGENT)
  const accepted = modeFromAccept(flags.accept)

  // A bad --format value is USAGE no matter what else was passed (even a winning --json): a typo'd
  // flag is never silently ignored.
  if (flags.format !== undefined && flags.format !== 'json' && flags.format !== 'text' && flags.format !== 'human') {
    throw usageError(`--format must be json|text|human, got ${JSON.stringify(flags.format)}`)
  }

  // --- mode ---
  let mode: RenderMode
  if (flags.json === true) mode = 'json'
  else if (flags.format !== undefined) mode = flags.format
  else if (accepted !== null) {
    mode = accepted
  } else if (agent) {
    mode = 'text' // agent alias defaults to text (token-cheap); pass --json to force json
  } else if (!s.stdoutTTY || isCI) {
    mode = 'text' // piped/redirected/CI → machine
  } else {
    mode = 'human'
  }

  // --- interactivity / streaming (independent of the mode's format) ---
  const interactive = mode === 'human' && s.stdinTTY && s.stdoutTTY && !isCI && !agent
  const stream = mode === 'human' && s.stdoutTTY && !isCI && !agent

  // --- color ---
  if (flags.color !== undefined && flags.color !== 'always' && flags.color !== 'never' && flags.color !== 'auto') {
    throw usageError(`--color must be always|never|auto, got ${JSON.stringify(flags.color)}`)
  }
  let color: boolean
  if (mode !== 'human') color = false // machine output is never colored
  else if (flags.noColor === true) color = false // --no-color is a NO_COLOR-equivalent request
  else if ('NO_COLOR' in env) color = false // no-color.org: presence wins, even over --color always
  else if (flags.color === 'always') color = true
  else if (flags.color === 'never') color = false
  else if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') color = true
  else if (env.FORCE_COLOR === '0') color = false
  else if (env.MDXE_COLOR === 'always') color = true
  else if (env.MDXE_COLOR === 'never') color = false
  else color = s.stdoutTTY && !isCI

  // --- width ---
  const width =
    mode === 'human'
      ? (s.columns ?? (env.COLUMNS !== undefined ? Number(env.COLUMNS) : 0)) || 80
      : Infinity // never wrap/truncate machine output

  return Object.freeze({ mode, color, width, interactive, stream })
}

/** Resolve the live context from `process` — the one place that touches the real terminal. */
export function resolveFromProcess(flags: GlobalFlags): OutputCtx {
  const stdout = process.stdout as NodeJS.WriteStream & { columns?: number }
  return resolveOutputCtx(flags, process.env as Env, {
    stdinTTY: Boolean(process.stdin.isTTY),
    stdoutTTY: Boolean(process.stdout.isTTY),
    ...(typeof stdout.columns === 'number' ? { columns: stdout.columns } : {}),
  })
}
