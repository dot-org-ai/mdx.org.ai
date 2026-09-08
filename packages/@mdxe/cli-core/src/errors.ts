/**
 * # @mdxe/cli-core `errors` — fail closed, loud, machine-parseable
 *
 * Ported from kestrel (`kestrel.markets` `src/cli/errors.ts`, MIT, © 2026 Nathan Clevenger) into
 * mdxe by mdx-8je.16, then lifted into the leaf package `@mdxe/cli-core` by mdx-8je.26. The kestrel-specific `application/problem+json` client type is replaced by a
 * local RFC 9457 shape so the HTTP faces (@mdxe/hono, mdx-8je.18) can preserve a server's typed
 * refusal through the throw without coupling to any client module.
 *
 * One error type ({@link CliError}) carrying a stable `code`, an `exit` code, and an optional
 * `hint`. The router body (mdxe `src/cli.ts` `main`) is wrapped in a single try/catch; any throw is
 * rendered by {@link fail} to **stderr** in the active mode and its exit code returned. stdout
 * stays a pure payload channel, so an agent's `JSON.parse(stdout)` never sees a half-written
 * object followed by an error. `code` strings are stable across releases — agents match on
 * `code`, not prose.
 */

import type { OutputCtx } from './context.js'

/**
 * RFC 9457 problem details, as a server may send on a non-2xx `application/problem+json` body.
 * Preserved ADDITIVELY on a {@link CliError} so the `--json` error envelope carries the server's own
 * `title`/`detail`/`code`/`remediation` as data, not just folded into the prose message.
 */
export interface ProblemDetails {
  readonly type?: string
  readonly title?: string
  readonly status?: number
  readonly detail?: string
  readonly instance?: string
  readonly code?: string
  readonly remediation?: string
  readonly [extension: string]: unknown
}

/**
 * The exit-code map. `0` iff the command truly succeeded; every error path is nonzero. The numbers
 * are STABLE across releases — a harness branches on them.
 *
 * `REFUSED` (6) is the fail-closed path WORKING: a typed refusal (a guard that declined to proceed —
 * an unimplemented format, a missing credential, a kill-switch). It is its OWN exit, never
 * `GENERIC`/1, so a caller can always tell "the guard held" from "something crashed".
 */
export const EXIT = {
  OK: 0,
  GENERIC: 1, // unexpected/uncaught — a crash
  USAGE: 2, // bad/unknown flag, missing required, bad --format, parse failure
  NOT_FOUND: 3, // a file / project / resource named on the command line is absent
  RUNTIME_UNAVAILABLE: 4, // a required runtime (workerd/Miniflare, ai-evaluate, an adapter) cannot load
  PAYMENT_REQUIRED: 5, // a remote verb returned a 402 (surfaced as data)
  REFUSED: 6, // a typed, fail-closed refusal — the guard WORKED; distinct from a crash
  SIGINT: 130,
} as const

/** A domain error with a stable code, an exit code, an optional hint line, and (when the error came
 *  off a problem+json wire body) the server's own {@link ProblemDetails}. */
export class CliError extends Error {
  override readonly name = 'CliError'
  readonly code: string
  readonly exit: number
  readonly hint?: string
  readonly problem?: ProblemDetails
  constructor(o: { code: string; exit: number; message: string; hint?: string; problem?: ProblemDetails }) {
    super(o.message)
    this.code = o.code
    this.exit = o.exit
    if (o.hint !== undefined) this.hint = o.hint
    if (o.problem !== undefined) this.problem = o.problem
  }
}

/** Shorthand constructors for the common codes — one place per (code, exit) pairing. */
export function usageError(message: string, hint?: string): CliError {
  return new CliError({ code: 'USAGE', exit: EXIT.USAGE, message, ...(hint !== undefined ? { hint } : {}) })
}
export function notFoundError(message: string, hint?: string): CliError {
  return new CliError({ code: 'NOT_FOUND', exit: EXIT.NOT_FOUND, message, ...(hint !== undefined ? { hint } : {}) })
}
export function runtimeUnavailableError(message: string, hint?: string): CliError {
  return new CliError({
    code: 'RUNTIME_UNAVAILABLE',
    exit: EXIT.RUNTIME_UNAVAILABLE,
    message,
    ...(hint !== undefined ? { hint } : {}),
  })
}
export function refusedError(code: string, message: string, hint?: string): CliError {
  return new CliError({ code, exit: EXIT.REFUSED, message, ...(hint !== undefined ? { hint } : {}) })
}

const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

/**
 * The transport errnos a raw `fetch` throws when it never reached an HTTP status — DNS misses,
 * refused/reset/timed-out/unreachable sockets. Node/undici surface these as the system errno on
 * the `TypeError`'s `cause`; Bun uses its own string codes for the same faults. An HTTP *status*
 * (4xx/5xx) is NOT here — those are typed by whoever read the response.
 */
const CONNECTION_ERRNOS = new Set([
  // Node / undici (libuv errno)
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'EPIPE',
  'EAI_FAIL',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  // Bun (SystemError string codes)
  'ConnectionRefused',
  'ConnectionClosed',
  'ConnectionTimeout',
  'FailedToOpenSocket',
  'DNSError',
])

/** The `code` string off an error-shaped value, if it carries one. */
function errCode(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const c = (e as { code?: unknown }).code
    if (typeof c === 'string') return c
  }
  return undefined
}

/**
 * Type a raw connection-level `fetch` failure (network down / DNS fail / refused socket) as a
 * fail-closed {@link CliError} — code `NETWORK_UNAVAILABLE`, exit {@link EXIT.RUNTIME_UNAVAILABLE}
 * (4), with a hint pointing at the network + the API base — instead of letting the untyped
 * `TypeError` fall through {@link fail} as an unclear GENERIC exit 1.
 *
 * Returns `null` for anything that is NOT a transport failure: an already-typed {@link CliError}
 * (leave it alone) and any other throw (a real bug stays GENERIC, never masked as a network blip).
 */
export function asConnectionError(e: unknown, base?: string): CliError | null {
  if (e instanceof CliError) return null
  const cause = typeof e === 'object' && e !== null ? (e as { cause?: unknown }).cause : undefined
  const code = errCode(e) ?? errCode(cause)
  const isFetchTransport =
    (code !== undefined && CONNECTION_ERRNOS.has(code)) ||
    (e instanceof TypeError && /fetch failed|failed to fetch|unable to connect|failed to connect/i.test(e.message))
  if (!isFetchTransport) return null
  const outer = e instanceof Error ? e.message : String(e)
  const inner = cause instanceof Error ? cause.message : undefined
  const parts = [outer]
  if (inner !== undefined && inner !== outer) parts.push(inner)
  else if (code !== undefined && !outer.includes(code)) parts.push(code)
  const detail = parts.join(' — ')
  const where = base !== undefined && base !== '' ? ` reaching ${base}` : ''
  return new CliError({
    code: 'NETWORK_UNAVAILABLE',
    exit: EXIT.RUNTIME_UNAVAILABLE,
    message: `network unavailable${where}: ${detail}`,
    hint: 'check your network connection and the API base (DO_API_URL)',
  })
}

/** Where {@link fail} writes. Injectable so the renderer is unit-testable without capturing stderr. */
export interface ErrorSink {
  write(chunk: string): unknown
}

/** The machine-shaped JSON error envelope `fail` emits in `json` mode. */
export interface ErrorEnvelope {
  error: { code: string; message: string; hint?: string; problem?: ProblemDetails }
}

/**
 * Render an error to **stderr** in the active mode and return its exit code. Never throws, never
 * writes to stdout. A non-`CliError` throw is treated as GENERIC (exit 1); `MDXE_DEBUG=1` also
 * dumps its stack in that case (dev only).
 */
export function fail(ctx: OutputCtx, err: unknown, sink: ErrorSink = process.stderr): number {
  const isCli = err instanceof CliError
  const code = isCli ? err.code : 'GENERIC'
  const exit = isCli ? err.exit : EXIT.GENERIC
  const message = err instanceof Error ? err.message : String(err)
  const hint = isCli ? err.hint : undefined
  const problem = isCli ? err.problem : undefined

  if (ctx.mode === 'json') {
    const obj: ErrorEnvelope = { error: { code, message } }
    if (hint !== undefined) obj.error.hint = hint
    if (problem !== undefined) obj.error.problem = problem
    sink.write(JSON.stringify(obj) + '\n')
  } else if (ctx.mode === 'text') {
    let line = `error\tcode=${code}\tmessage=${message}`
    if (hint !== undefined) line += `\thint=${hint}`
    sink.write(line + '\n')
  } else {
    const emsg = ctx.color ? `${RED}error:${RESET} ${message}` : `error: ${message}`
    sink.write(emsg + '\n')
    if (hint !== undefined) {
      const hmsg = ctx.color ? `${DIM}hint: ${hint}${RESET}` : `hint: ${hint}`
      sink.write(hmsg + '\n')
    }
  }

  if (!isCli && process.env.MDXE_DEBUG === '1' && err instanceof Error && err.stack !== undefined) {
    sink.write(err.stack + '\n')
  }
  return exit
}
