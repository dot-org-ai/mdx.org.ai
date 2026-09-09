/**
 * # cli/args — argv parsing + global-flag extraction
 *
 * Ported from kestrel (`kestrel.markets` `src/cli/args.ts`, MIT, © 2026 Nathan Clevenger) into mdxe
 * by mdx-8je.16 (the kestrel-only `--api` global dropped; `-V` kept for version so mdxe's existing
 * `-v` = `--verbose` is untouched).
 *
 * `parseArgs` reads leading positionals, then `--flag value` pairs, against a per-verb known set:
 * `booleanFlags` are consumed value-lessly, `valueFlags` each take the following token as a value.
 * A `--flag` in **neither** set is an UNKNOWN flag and a loud {@link CliError} (exit 2) **regardless
 * of position** — mid-argv or trailing — so an agent-authored command line with a typo can never be
 * silently swallowed and masquerade as an intentional run. Anything else malformed is likewise exit 2.
 * `extractGlobals` peels the render flags (`--json`/`--format`/`--agent`/`--color`/`--no-color`/
 * `-h`/`--help`/`-V`/`--version`) off the raw argv **before** the router runs, so every command sees
 * a clean argv (with only its own flags) and the resolver sees the global flags.
 */

import type { GlobalFlags } from '@mdxe/cli-core'
import { usageError } from '@mdxe/cli-core'

/** A parsed argv: leading positionals, then `--flag value` pairs, plus consumed boolean flags. */
export interface ParsedArgs {
  readonly positionals: readonly string[]
  readonly flags: Map<string, string>
  readonly bools: ReadonlySet<string>
}

/**
 * Positionals-then-flags, against a per-verb known set. `booleanFlags` are value-less; `valueFlags`
 * each consume the following token. A `--flag` in neither set is UNKNOWN → loud USAGE error, checked
 * **before** value consumption so it fails identically mid-argv or trailing (fail-closed). A
 * recognized value flag with no following token is the distinct "missing value" USAGE error.
 */
export function parseArgs(
  argv: readonly string[],
  booleanFlags: ReadonlySet<string> = new Set(),
  valueFlags: ReadonlySet<string> = new Set(),
): ParsedArgs {
  const positionals: string[] = []
  const flags = new Map<string, string>()
  const bools = new Set<string>()
  let i = 0
  while (i < argv.length && !argv[i]!.startsWith('--')) {
    positionals.push(argv[i]!)
    i += 1
  }
  for (; i < argv.length; i += 1) {
    const key = argv[i]!
    if (!key.startsWith('--')) {
      throw usageError(`bad argument ${JSON.stringify(key)} — expected a --flag here`)
    }
    const name = key.slice(2)
    if (booleanFlags.has(name)) {
      bools.add(name)
      continue
    }
    // Reject unknown flags uniformly, BEFORE any value is consumed — so a typo fails closed the same
    // way whether or not a token follows it, never swallowing the next token silently.
    if (!valueFlags.has(name)) throw usageError(`unknown flag --${name}`)
    const val = argv[i + 1]
    if (val === undefined) throw usageError(`missing value for --${name}`)
    flags.set(name, val)
    i += 1
  }
  return { positionals, flags, bools }
}

/** Required flag or a loud USAGE error. */
export function required(flags: Map<string, string>, name: string): string {
  const v = flags.get(name)
  if (v === undefined) throw usageError(`missing required flag --${name}`)
  return v
}

/** The result of stripping the global render flags off a raw argv. */
export interface GlobalScan {
  readonly globals: GlobalFlags
  /** The remaining argv with global flags removed (command + its own args). */
  readonly rest: string[]
  /** True if `-h`/`--help`/`help` requested (fast-path before the router). */
  readonly wantHelp: boolean
  /** True if `-V`/`--version`/`version` requested (fast-path before the router). */
  readonly wantVersion: boolean
}

/** The global flag names `extractGlobals` consumes — exported so a per-command parser can tell that
 *  a command's own `--json` (e.g. `tail --json`) was already folded into the resolved ctx. */
export const GLOBAL_FLAGS = ['--json', '--agent', '--no-color', '--format', '--color', '-h', '--help', '-V', '--version'] as const

/**
 * Peel the global render + meta flags off a raw argv. Recognizes `--json`, `--format <v>`,
 * `--agent`, `--color <v>`, `--no-color`, `-h`/`--help`, `-V`/`--version`. Everything else passes
 * through in `rest` in order. An unknown `--flag` is **not** rejected here — it is left in `rest`
 * for the command's own parser to accept or reject (so `--fromat` errors at the command, not
 * silently swallowed). Fast-path meta words (`help`, `version`) as the FIRST token are detected.
 *
 * Throws a USAGE {@link CliError} when `--format`/`--color` has no value.
 */
export function extractGlobals(argv: readonly string[]): GlobalScan {
  const rest: string[] = []
  const globals: {
    json?: boolean
    format?: string
    agent?: boolean
    color?: string
    noColor?: boolean
  } = {}
  let wantHelp = false
  let wantVersion = false

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!
    switch (a) {
      case '--json':
        globals.json = true
        break
      case '--agent':
        globals.agent = true
        break
      case '--no-color':
        globals.noColor = true
        break
      case '-h':
      case '--help':
        wantHelp = true
        break
      case '-V':
      case '--version':
        wantVersion = true
        break
      case '--format': {
        const v = argv[i + 1]
        if (v === undefined) throw usageError('missing value for --format')
        globals.format = v
        i += 1
        break
      }
      case '--color': {
        const v = argv[i + 1]
        if (v === undefined) throw usageError('missing value for --color')
        globals.color = v
        i += 1
        break
      }
      default:
        rest.push(a)
    }
  }

  // Bare `help`/`version` as the leading command word are meta fast-paths too.
  if (rest[0] === 'help') wantHelp = true
  if (rest[0] === 'version') wantVersion = true

  return { globals, rest, wantHelp, wantVersion }
}
