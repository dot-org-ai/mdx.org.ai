/**
 * cli/args — unknown flags are rejected BEFORE value consumption (mid-argv or trailing), missing
 * values are the distinct USAGE error, and the global scan peels only the render/meta flags.
 */

import { describe, expect, test } from 'vitest'

import { parseArgs, required, extractGlobals, GLOBAL_FLAGS } from './args.js'
import { CliError, EXIT } from '@mdxe/cli-core'

function usage(fn: () => unknown): CliError {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(CliError)
    expect((e as CliError).code).toBe('USAGE')
    expect((e as CliError).exit).toBe(EXIT.USAGE)
    return e as CliError
  }
  throw new Error('expected a USAGE CliError')
}

describe('parseArgs — positionals then flags against a known set', () => {
  const BOOLS = new Set(['dry-run'])
  const VALS = new Set(['name', 'port'])

  test('positionals, value flags, boolean flags', () => {
    const p = parseArgs(['a', 'b', '--name', 'x', '--dry-run', '--port', '3000'], BOOLS, VALS)
    expect(p.positionals).toEqual(['a', 'b'])
    expect(p.flags.get('name')).toBe('x')
    expect(p.flags.get('port')).toBe('3000')
    expect(p.bools.has('dry-run')).toBe(true)
  })

  test('an unknown flag is rejected mid-argv, BEFORE its would-be value is consumed', () => {
    const e = usage(() => parseArgs(['--nmae', 'x', '--port', '1'], BOOLS, VALS))
    expect(e.message).toContain('--nmae')
  })

  test('an unknown flag is rejected trailing (no token follows) with the same error', () => {
    const e = usage(() => parseArgs(['--name', 'x', '--nmae'], BOOLS, VALS))
    expect(e.message).toContain('unknown flag --nmae')
  })

  test('a known value flag with no value is the distinct "missing value" error', () => {
    const e = usage(() => parseArgs(['--name'], BOOLS, VALS))
    expect(e.message).toContain('missing value for --name')
  })

  test('a stray positional after flags is rejected', () => {
    usage(() => parseArgs(['--name', 'x', 'stray'], BOOLS, VALS))
  })

  test('required() is loud on absence', () => {
    const p = parseArgs(['--name', 'x'], BOOLS, VALS)
    expect(required(p.flags, 'name')).toBe('x')
    usage(() => required(p.flags, 'port'))
  })
})

describe('extractGlobals — peel render + meta flags, pass everything else through in order', () => {
  test('recognises every global and leaves the command argv clean', () => {
    const s = extractGlobals(['deploy', '--json', '--dry-run', '--color', 'never', '--agent', '--no-color', '--format', 'text'])
    expect(s.globals).toEqual({ json: true, color: 'never', agent: true, noColor: true, format: 'text' })
    expect(s.rest).toEqual(['deploy', '--dry-run'])
    expect(s.wantHelp).toBe(false)
    expect(s.wantVersion).toBe(false)
  })

  test('-h/--help and -V/--version are meta fast-paths; bare help/version words too', () => {
    expect(extractGlobals(['-h']).wantHelp).toBe(true)
    expect(extractGlobals(['deploy', '--help']).wantHelp).toBe(true)
    expect(extractGlobals(['help', 'deploy']).wantHelp).toBe(true)
    expect(extractGlobals(['-V']).wantVersion).toBe(true)
    expect(extractGlobals(['--version']).wantVersion).toBe(true)
    expect(extractGlobals(['version']).wantVersion).toBe(true)
  })

  test('-v (lowercase) is NOT a global — it stays the command-level verbose flag', () => {
    const s = extractGlobals(['dev', '-v'])
    expect(s.wantVersion).toBe(false)
    expect(s.rest).toEqual(['dev', '-v'])
  })

  test('--format / --color without a value fail closed as USAGE', () => {
    usage(() => extractGlobals(['--format']))
    usage(() => extractGlobals(['dev', '--color']))
  })

  test('an unknown flag is NOT rejected here — it passes through for the command to reject', () => {
    expect(extractGlobals(['dev', '--fromat', 'json']).rest).toEqual(['dev', '--fromat', 'json'])
  })

  test('GLOBAL_FLAGS names exactly what extractGlobals consumes', () => {
    for (const f of GLOBAL_FLAGS) {
      const argv = f === '--format' ? [f, 'json'] : f === '--color' ? [f, 'auto'] : [f]
      expect(extractGlobals(argv).rest).toEqual([])
    }
  })
})
