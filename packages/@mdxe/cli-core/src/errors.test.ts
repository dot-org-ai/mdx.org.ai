/**
 * errors — stable exit codes, stderr-only rendering in every mode, and the fail-closed-working
 * vs crash distinction (REFUSED 6 ≠ GENERIC 1).
 */

import { describe, expect, test } from 'vitest'

import { CliError, EXIT, fail, usageError, notFoundError, refusedError, runtimeUnavailableError, asConnectionError } from './errors.js'
import type { OutputCtx } from './context.js'

const TEXT: OutputCtx = { mode: 'text', color: false, width: Infinity, interactive: false, stream: false }
const JSON_CTX: OutputCtx = { mode: 'json', color: false, width: Infinity, interactive: false, stream: false }
const HUMAN: OutputCtx = { mode: 'human', color: true, width: 80, interactive: true, stream: true }

function capture(): { sink: { write(s: string): void }; out: string[] } {
  const out: string[] = []
  return { sink: { write: (s) => void out.push(s) }, out }
}

describe('EXIT — the stable code map', () => {
  test('every error path is nonzero and every code is distinct', () => {
    const codes = Object.values(EXIT)
    expect(EXIT.OK).toBe(0)
    expect(new Set(codes).size).toBe(codes.length)
    for (const [k, v] of Object.entries(EXIT)) if (k !== 'OK') expect(v).not.toBe(0)
  })

  test('the numbers are pinned (a harness branches on them)', () => {
    expect(EXIT).toEqual({ OK: 0, GENERIC: 1, USAGE: 2, NOT_FOUND: 3, RUNTIME_UNAVAILABLE: 4, PAYMENT_REQUIRED: 5, REFUSED: 6, SIGINT: 130 })
  })

  test('a fail-closed refusal (guard WORKED) exits differently from a crash', () => {
    expect(refusedError('FORMAT_UNIMPLEMENTED', 'no register for text/csv').exit).toBe(EXIT.REFUSED)
    expect(EXIT.REFUSED).not.toBe(EXIT.GENERIC)
    expect(fail(TEXT, new Error('boom'), capture().sink)).toBe(EXIT.GENERIC)
  })

  test('the shorthand constructors pair code and exit', () => {
    expect(usageError('x')).toMatchObject({ code: 'USAGE', exit: 2 })
    expect(notFoundError('x', 'h')).toMatchObject({ code: 'NOT_FOUND', exit: 3, hint: 'h' })
    expect(runtimeUnavailableError('x')).toMatchObject({ code: 'RUNTIME_UNAVAILABLE', exit: 4 })
    expect(usageError('x').name).toBe('CliError')
    expect(usageError('x')).toBeInstanceOf(Error)
  })
})

describe('fail — renders to the sink (stderr) in the active mode, returns the exit code', () => {
  test('json mode: one JSON envelope line, code + message (+ hint, + problem)', () => {
    const { sink, out } = capture()
    const err = new CliError({ code: 'NOT_FOUND', exit: 3, message: 'no such file', hint: 'check the path', problem: { title: 'Not Found', status: 404 } })
    expect(fail(JSON_CTX, err, sink)).toBe(3)
    expect(out).toHaveLength(1)
    expect(JSON.parse(out[0]!)).toEqual({ error: { code: 'NOT_FOUND', message: 'no such file', hint: 'check the path', problem: { title: 'Not Found', status: 404 } } })
  })

  test('text mode: a tab-separated error line', () => {
    const { sink, out } = capture()
    expect(fail(TEXT, usageError('unknown flag --x', 'run mdxe help'), sink)).toBe(2)
    expect(out.join('')).toBe('error\tcode=USAGE\tmessage=unknown flag --x\thint=run mdxe help\n')
  })

  test('human mode: prose, colored only when ctx.color', () => {
    const c = capture()
    fail(HUMAN, usageError('bad', 'hint here'), c.sink)
    expect(c.out.join('')).toContain('\x1b[31merror:\x1b[0m bad')
    expect(c.out.join('')).toContain('hint: hint here')
    const plain = capture()
    fail({ ...HUMAN, color: false }, usageError('bad'), plain.sink)
    expect(plain.out.join('')).toBe('error: bad\n')
  })

  test('a non-CliError throw is GENERIC exit 1 with code=GENERIC', () => {
    const { sink, out } = capture()
    expect(fail(JSON_CTX, new TypeError('kaboom'), sink)).toBe(1)
    expect(JSON.parse(out[0]!).error.code).toBe('GENERIC')
    const t = capture()
    expect(fail(TEXT, 'a string throw', t.sink)).toBe(1)
    expect(t.out[0]).toContain('message=a string throw')
  })
})

describe('asConnectionError — transport faults typed as NETWORK_UNAVAILABLE (exit 4)', () => {
  test('undici fetch failed with an errno cause', () => {
    const e = new TypeError('fetch failed')
    ;(e as { cause?: unknown }).cause = Object.assign(new Error('getaddrinfo ENOTFOUND apis.do'), { code: 'ENOTFOUND' })
    const c = asConnectionError(e, 'https://apis.do')
    expect(c).not.toBeNull()
    expect(c!.code).toBe('NETWORK_UNAVAILABLE')
    expect(c!.exit).toBe(EXIT.RUNTIME_UNAVAILABLE)
    expect(c!.message).toContain('reaching https://apis.do')
    expect(c!.message).toContain('ENOTFOUND')
  })

  test('a Bun-style string code', () => {
    expect(asConnectionError(Object.assign(new Error('refused'), { code: 'ConnectionRefused' }))).not.toBeNull()
  })

  test('leaves typed CliErrors and real bugs alone', () => {
    expect(asConnectionError(usageError('x'))).toBeNull()
    expect(asConnectionError(new TypeError('x is not a function'))).toBeNull()
    expect(asConnectionError(new Error('some bug'))).toBeNull()
  })
})
