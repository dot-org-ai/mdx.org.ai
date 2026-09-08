/**
 * context — the capability resolver is a PURE function of (flags, env, streams). These tests
 * pin the precedence (explicit flag > Accept > --agent/env > CI > piped > TTY), CI + NO_COLOR +
 * piped handling, and the invariant that machine modes never wrap/truncate/color. No `process`
 * is touched.
 *
 * Ported from kestrel `tests/cli/context.test.ts` (MIT, © 2026 Nathan Clevenger) by mdx-8je.16;
 * the Accept rung and the mdxe env names are the additions.
 */

import { describe, expect, test } from 'vitest'

import { resolveOutputCtx, modeFromAccept, FAILSAFE_CTX, type RenderMode } from './context.js'
import { CliError, EXIT } from './errors.js'

const TTY = { stdinTTY: true, stdoutTTY: true, columns: 120 }
const PIPED = { stdinTTY: false, stdoutTTY: false }

describe('mode resolution — flag > Accept > env > auto', () => {
  test('TTY, no flags → human', () => {
    expect(resolveOutputCtx({}, {}, TTY).mode).toBe('human')
  })

  test('piped/redirected (non-TTY) → text', () => {
    expect(resolveOutputCtx({}, {}, PIPED).mode).toBe('text')
  })

  test('--json wins even on a TTY', () => {
    expect(resolveOutputCtx({ json: true }, {}, TTY).mode).toBe('json')
  })

  test('--format json|text|human is honored on a TTY', () => {
    for (const f of ['json', 'text', 'human'] as RenderMode[]) {
      expect(resolveOutputCtx({ format: f }, {}, TTY).mode).toBe(f)
    }
  })

  test('--agent defaults to text on a TTY (token-cheap)', () => {
    expect(resolveOutputCtx({ agent: true }, {}, TTY).mode).toBe('text')
  })

  test('--json overrides --agent (force json)', () => {
    expect(resolveOutputCtx({ agent: true, json: true }, {}, TTY).mode).toBe('json')
  })

  test('MDXE_AGENT=1 env → text', () => {
    expect(resolveOutputCtx({}, { MDXE_AGENT: '1' }, TTY).mode).toBe('text')
  })

  test('AGENT=1 env → text', () => {
    expect(resolveOutputCtx({}, { AGENT: '1' }, TTY).mode).toBe('text')
  })

  test('agent markers count on ANY non-empty value (unified with resolveCaller); empty does not trip', () => {
    expect(resolveOutputCtx({}, { MDXE_AGENT: 'true' }, TTY).mode).toBe('text')
    expect(resolveOutputCtx({}, { AGENT: '0' }, TTY).mode).toBe('text') // fail-closed: weird value → machine
    expect(resolveOutputCtx({}, { MDXE_AGENT: '' }, TTY).mode).toBe('human') // a bare FOO= is not set
    expect(resolveOutputCtx({}, { AGENT: '' }, TTY).mode).toBe('human')
  })

  test('CI (non-TTY-equivalent) → text even on a TTY', () => {
    expect(resolveOutputCtx({}, { CI: 'true' }, TTY).mode).toBe('text')
    expect(resolveOutputCtx({}, { GITHUB_ACTIONS: 'true' }, TTY).mode).toBe('text')
  })

  test('bad --format → loud CliError (exit USAGE = 2)', () => {
    let caught: unknown
    try {
      resolveOutputCtx({ format: 'xml' }, {}, TTY)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(CliError)
    expect((caught as CliError).exit).toBe(EXIT.USAGE)
    expect((caught as CliError).exit).toBe(2)
    expect((caught as CliError).code).toBe('USAGE')
  })

  test('bad --format is USAGE even when --json would otherwise win (never silently ignored)', () => {
    expect(() => resolveOutputCtx({ json: true, format: 'xml' }, {}, TTY)).toThrow(CliError)
    expect(() => resolveOutputCtx({ format: 'xml' }, { CLAUDECODE: '1' }, PIPED)).toThrow(CliError)
  })
})

describe('Accept rung (HTTP faces) — below --format, above agent env', () => {
  test('modeFromAccept maps the media ranges', () => {
    expect(modeFromAccept('application/json')).toBe('json')
    expect(modeFromAccept('application/ld+json')).toBe('json')
    expect(modeFromAccept('text/plain')).toBe('text')
    expect(modeFromAccept('text/markdown; charset=utf-8')).toBe('text')
    expect(modeFromAccept('text/html,application/xhtml+xml')).toBe('human')
    expect(modeFromAccept('*/*')).toBeNull()
    expect(modeFromAccept('image/png')).toBeNull()
    expect(modeFromAccept(undefined)).toBeNull()
    expect(modeFromAccept('')).toBeNull()
  })

  test('Accept decides the mode when no --format is given', () => {
    expect(resolveOutputCtx({ accept: 'application/json' }, {}, PIPED).mode).toBe('json')
    expect(resolveOutputCtx({ accept: 'text/markdown' }, {}, TTY).mode).toBe('text')
  })

  test('--format beats Accept', () => {
    expect(resolveOutputCtx({ format: 'text', accept: 'application/json' }, {}, PIPED).mode).toBe('text')
  })

  test('Accept beats the agent env markers', () => {
    expect(resolveOutputCtx({ accept: 'application/json' }, { CLAUDECODE: '1', AGENT: '1' }, TTY).mode).toBe('json')
  })

  test('an unrecognised Accept falls through the ladder (never a silent default format)', () => {
    expect(resolveOutputCtx({ accept: 'image/png' }, { AGENT: '1' }, TTY).mode).toBe('text')
    expect(resolveOutputCtx({ accept: '*/*' }, {}, PIPED).mode).toBe('text')
  })
})

describe('color', () => {
  test('human TTY defaults to color on', () => {
    expect(resolveOutputCtx({}, {}, TTY).color).toBe(true)
  })

  test('machine modes are never colored', () => {
    expect(resolveOutputCtx({ json: true }, {}, TTY).color).toBe(false)
    expect(resolveOutputCtx({ format: 'text' }, {}, TTY).color).toBe(false)
  })

  test('NO_COLOR presence wins (human)', () => {
    expect(resolveOutputCtx({}, { NO_COLOR: '1' }, TTY).color).toBe(false)
    // even an empty NO_COLOR counts (presence, per no-color.org)
    expect(resolveOutputCtx({}, { NO_COLOR: '' }, TTY).color).toBe(false)
  })

  test('NO_COLOR presence beats --color always, always', () => {
    expect(resolveOutputCtx({ color: 'always' }, { NO_COLOR: '' }, TTY).color).toBe(false)
    expect(resolveOutputCtx({ color: 'always' }, { NO_COLOR: '1', FORCE_COLOR: '1' }, TTY).color).toBe(false)
  })

  test('--no-color disables color (human)', () => {
    expect(resolveOutputCtx({ noColor: true }, {}, TTY).color).toBe(false)
  })

  test('--color always forces color (human only)', () => {
    expect(resolveOutputCtx({ color: 'always' }, {}, TTY).color).toBe(true)
    expect(resolveOutputCtx({ color: 'always' }, {}, PIPED).color).toBe(false) // piped → text → never colored
    expect(resolveOutputCtx({ color: 'always', json: true }, {}, TTY).color).toBe(false)
  })

  test('--color never disables', () => {
    expect(resolveOutputCtx({ color: 'never' }, {}, TTY).color).toBe(false)
  })

  test('FORCE_COLOR / MDXE_COLOR env are honored below the flags', () => {
    expect(resolveOutputCtx({}, { FORCE_COLOR: '1' }, { stdinTTY: true, stdoutTTY: true }).color).toBe(true)
    expect(resolveOutputCtx({}, { FORCE_COLOR: '0' }, TTY).color).toBe(false)
    expect(resolveOutputCtx({}, { MDXE_COLOR: 'never' }, TTY).color).toBe(false)
    expect(resolveOutputCtx({ color: 'always' }, { FORCE_COLOR: '0' }, TTY).color).toBe(true)
  })

  test('bad --color → loud CliError (exit 2)', () => {
    expect(() => resolveOutputCtx({ color: 'rainbow' }, {}, TTY)).toThrow(CliError)
    try {
      resolveOutputCtx({ color: 'rainbow' }, {}, TTY)
    } catch (e) {
      expect((e as CliError).exit).toBe(2)
    }
  })
})

describe('width + interactivity + streaming', () => {
  test('human uses the terminal columns', () => {
    expect(resolveOutputCtx({}, {}, TTY).width).toBe(120)
  })

  test('human falls back to COLUMNS env, else 80', () => {
    expect(resolveOutputCtx({}, { COLUMNS: '100' }, { stdinTTY: true, stdoutTTY: true }).width).toBe(100)
    expect(resolveOutputCtx({}, {}, { stdinTTY: true, stdoutTTY: true }).width).toBe(80)
  })

  test('machine modes never wrap/truncate (width = Infinity)', () => {
    expect(resolveOutputCtx({ json: true }, {}, TTY).width).toBe(Infinity)
    expect(resolveOutputCtx({}, {}, PIPED).width).toBe(Infinity)
  })

  test('interactive + stream only on a human TTY, off under CI/agent/pipe', () => {
    const human = resolveOutputCtx({}, {}, TTY)
    expect(human.interactive).toBe(true)
    expect(human.stream).toBe(true)

    expect(resolveOutputCtx({}, { CI: '1' }, TTY).interactive).toBe(false)
    expect(resolveOutputCtx({ agent: true }, {}, TTY).stream).toBe(false)
    expect(resolveOutputCtx({}, {}, PIPED).interactive).toBe(false)
    expect(resolveOutputCtx({}, { CLAUDECODE: '1', AGENT: '1' }, TTY).interactive).toBe(false)
  })

  test('the returned ctx is frozen (no downstream mutation)', () => {
    const ctx = resolveOutputCtx({}, {}, TTY)
    expect(Object.isFrozen(ctx)).toBe(true)
  })

  test('FAILSAFE_CTX is frozen, plain, colorless, non-interactive', () => {
    expect(Object.isFrozen(FAILSAFE_CTX)).toBe(true)
    expect(FAILSAFE_CTX).toEqual({ mode: 'text', color: false, width: Infinity, interactive: false, stream: false })
  })

  test('same inputs → same ctx (deterministic)', () => {
    const a = resolveOutputCtx({ color: 'auto' }, { COLUMNS: '90' }, { stdinTTY: true, stdoutTTY: true })
    const b = resolveOutputCtx({ color: 'auto' }, { COLUMNS: '90' }, { stdinTTY: true, stdoutTTY: true })
    expect(a).toEqual(b)
  })
})
