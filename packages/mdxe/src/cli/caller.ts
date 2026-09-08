/**
 * # cli/caller — the ONE Caller resolver: env-first / TTY-second, fail-closed to non-interactive
 *
 * Ported from kestrel (`kestrel.markets` `src/cli/caller.ts`, MIT, © 2026 Nathan Clevenger) into
 * mdxe by mdx-8je.16 (`KESTREL_AGENT` → `MDXE_AGENT`; otherwise the ADR-0035 table verbatim).
 *
 * `resolveCaller()` decides **who is invoking** `mdxe` — an automated **agent** (a coding-agent
 * harness, CI, a pipe) or a **human** — and whether the invocation is eligible for an interactive
 * surface (a **confident human only**).
 *
 * ## The resolution ladder (the load-bearing order)
 *   1. an explicit render flag (`--json` / `--format` / `--agent`) **wins** → non-interactive;
 *   2. else a detected **agent env** → `agent`, **never** interactive (env beats a real TTY: an agent
 *      can hold a PTY, so `isatty` is true — the env is the truth, the TTY is not);
 *   3. else **CI** → `agent`, never interactive;
 *   4. else both stdin+stdout are real TTYs and no agent env / CI / flag → a **confident human** →
 *      interactive-eligible;
 *   5. else (a piped / redirected human) → `human`, non-interactive (static text).
 *
 * **UNDER ANY AMBIGUITY, RESOLVE NON-INTERACTIVE.** The asymmetry is the whole argument: a
 * wrongly-launched TUI (or dev server) **blocks an automated harness forever** — the worst failure
 * in the system; guessing "agent" wrong merely gives a human plain text they can override with a
 * flag. `interactive` is therefore `true` only when *every* condition for a confident human holds.
 *
 * Pure + deterministic: reads its `flags` / `env` / `streams` arguments, never `process` directly
 * (except the thin {@link resolveCallerFromProcess} wrapper), so the whole detection matrix is
 * unit-testable without a terminal. Node-light (no heavy imports): safe on the CLI hot path.
 */

import type { GlobalFlags } from './context.js'

/** Who is invoking. */
export type CallerKind = 'agent' | 'human'
export const CALLER_KINDS = ['agent', 'human'] as const satisfies readonly CallerKind[]

/** How the Caller was decided — auditable, never a guess we hide. */
export type CallerDetection = 'flag' | 'env' | 'ci' | 'tty'
export const CALLER_DETECTIONS = ['flag', 'env', 'ci', 'tty'] as const satisfies readonly CallerDetection[]

/**
 * The resolved Caller. The single source read by the bare-invocation orientation so rendering and
 * any later telemetry can never disagree about who is calling.
 *
 * FAIL-CLOSED: under ANY ambiguity `interactive` is `false`.
 */
export interface Caller {
  readonly kind: CallerKind
  /** The detected harness / CI system, when known (e.g. `"CLAUDECODE"`, `"CI"`). `null` ⇒ unknown,
   *  never invented. */
  readonly harness: string | null
  readonly detectedBy: CallerDetection
  /** Interactive session eligible: a CONFIDENT human only — both TTYs, no agent env, no CI, no flag. */
  readonly interactive: boolean
}

/**
 * The agent env-var table. An agent harness sets one of these; they are checked BEFORE `isatty`
 * because an agent can hold a PTY (where `isatty` is true) and the env is the ground truth the TTY
 * would lie about. `CODEX_*` is a PREFIX (any `CODEX_…` var). `MDXE_AGENT` is this CLI's own agent
 * signal (`./context.ts` `resolveOutputCtx`), folded in so the two resolvers agree on it.
 */
export const AGENT_ENV_MARKERS = [
  'CLAUDECODE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CURSOR_AGENT',
  'GEMINI_CLI',
  'OPENCODE',
  'AI_AGENT',
  'AGENT',
  'MDXE_AGENT',
] as const

/** The `CODEX_*` prefix — any environment variable whose name starts with this. */
export const AGENT_ENV_PREFIX = 'CODEX_' as const

/** CI markers. `CI` is canonical; the others are the set `resolveOutputCtx` reads. */
export const CI_MARKERS = ['CI', 'GITHUB_ACTIONS', 'BUILDKITE', 'GITLAB_CI'] as const

interface Env {
  readonly [k: string]: string | undefined
}

interface Streams {
  readonly stdinTTY: boolean
  readonly stdoutTTY: boolean
}

/** A var counts as SET when present and non-empty — a bare `FOO=` never trips detection. */
function isSet(v: string | undefined): boolean {
  return v !== undefined && v !== ''
}

/** The FIRST matching agent marker (exact table then the `CODEX_*` prefix), or `null`. */
export function detectAgentEnv(env: Env): string | null {
  for (const key of AGENT_ENV_MARKERS) {
    if (isSet(env[key])) return key
  }
  for (const key of Object.keys(env)) {
    if (key.startsWith(AGENT_ENV_PREFIX) && isSet(env[key])) return key
  }
  return null
}

/** The FIRST matching CI marker, or `null`. */
export function detectCI(env: Env): string | null {
  for (const key of CI_MARKERS) {
    if (isSet(env[key])) return key
  }
  return null
}

/** True iff a render flag was given explicitly — `--json`, `--format <m>`, `--agent`, or (HTTP
 *  faces) an `Accept` header. Any of them is a machine request: non-interactive. */
function hasRenderFlag(flags: GlobalFlags): boolean {
  return flags.json === true || flags.format !== undefined || flags.agent === true || flags.accept !== undefined
}

/**
 * Resolve the Caller from parsed flags, the environment, and the two stream TTY bits. Pure and total.
 * See the module header for the ladder; the asymmetry (fail-closed to non-interactive) is enforced by
 * the single `interactive` conjunction at the end — it can only be `true` for a confident human.
 */
export function resolveCaller(flags: GlobalFlags, env: Env, s: Streams): Caller {
  const agentEnv = detectAgentEnv(env)
  const ci = detectCI(env)
  const renderFlag = hasRenderFlag(flags)

  let kind: CallerKind
  let harness: string | null
  let detectedBy: CallerDetection
  if (flags.agent === true) {
    // An explicit `--agent` is an unambiguous machine request.
    kind = 'agent'
    harness = null
    detectedBy = 'flag'
  } else if (agentEnv !== null) {
    // ENV BEATS TTY: an agent holding a PTY is still an agent.
    kind = 'agent'
    harness = agentEnv
    detectedBy = 'env'
  } else if (ci !== null) {
    kind = 'agent'
    harness = ci
    detectedBy = 'ci'
  } else if (renderFlag) {
    // A human (or agent) forcing `--json`/`--format`: machine output, but no agent env to attribute.
    kind = 'human'
    harness = null
    detectedBy = 'flag'
  } else {
    // Fell through to the terminal probe.
    kind = 'human'
    harness = null
    detectedBy = 'tty'
  }

  // --- interactive: a CONFIDENT human ONLY (fail-closed) ---
  // Every clause must hold: no forcing flag, no agent env, no CI, and BOTH streams real TTYs. Any
  // ambiguity leaves at least one clause false ⇒ non-interactive.
  const interactive = kind === 'human' && !renderFlag && agentEnv === null && ci === null && s.stdinTTY && s.stdoutTTY

  return Object.freeze({ kind, harness, detectedBy, interactive })
}

/** Resolve the live Caller from `process` — the one place that touches the real terminal + env. */
export function resolveCallerFromProcess(flags: GlobalFlags): Caller {
  return resolveCaller(flags, process.env as Env, {
    stdinTTY: Boolean(process.stdin.isTTY),
    stdoutTTY: Boolean(process.stdout.isTTY),
  })
}
