/**
 * # cli — resolveCaller: the full detection matrix
 *
 * Ported from kestrel `tests/cli/caller.test.ts` (MIT, © 2026 Nathan Clevenger) by mdx-8je.16.
 *
 * The resolution ladder and the NEVER-HANG safety rule, as a PURE matrix. The detector reads its
 * `(flags, env, streams)` arguments only — never a real terminal — so every rung is asserted
 * deterministically here; the bare-invocation behaviour is then pinned THROUGH the real spawned
 * driver in `tests/cli-spawn.test.ts`.
 *
 * The load-bearing asymmetry: `interactive` is `true` for a CONFIDENT human ONLY. Every other rung —
 * an agent (even holding a PTY), CI, a forcing flag, a pipe — is non-interactive, because a
 * wrongly-launched TUI blocks a harness forever while a wrong "agent" guess is a flag away from fixed.
 */

import { describe, expect, test } from 'vitest'

import { resolveCaller, detectAgentEnv, detectCI, AGENT_ENV_MARKERS, CI_MARKERS } from './caller.js'
import type { GlobalFlags } from './context.js'

const NO_FLAGS: GlobalFlags = {}
const BOTH_TTY = { stdinTTY: true, stdoutTTY: true } as const
const NO_TTY = { stdinTTY: false, stdoutTTY: false } as const

describe('resolveCaller — the detection matrix', () => {
  test('(a) agent env set + BOTH TTYs real → AGENT, env beats the TTY, non-interactive', () => {
    const c = resolveCaller(NO_FLAGS, { CLAUDECODE: '1' }, BOTH_TTY)
    expect(c.kind).toBe('agent')
    expect(c.detectedBy).toBe('env')
    expect(c.harness).toBe('CLAUDECODE')
    expect(c.interactive).toBe(false) // the whole point: a PTY-holding agent NEVER launches the session
  })

  test('(b) piped human (no env, no CI, no flag, stdout not a TTY) → HUMAN, tty, non-interactive', () => {
    const c = resolveCaller(NO_FLAGS, {}, { stdinTTY: true, stdoutTTY: false })
    expect(c.kind).toBe('human')
    expect(c.detectedBy).toBe('tty')
    expect(c.harness).toBeNull()
    expect(c.interactive).toBe(false)
  })

  test('(c) CI=1 → AGENT, ci, non-interactive (even with both TTYs)', () => {
    const c = resolveCaller(NO_FLAGS, { CI: '1' }, BOTH_TTY)
    expect(c.kind).toBe('agent')
    expect(c.detectedBy).toBe('ci')
    expect(c.harness).toBe('CI')
    expect(c.interactive).toBe(false)
  })

  test('(d) an explicit flag wins over everything → non-interactive', () => {
    const agent = resolveCaller({ agent: true }, {}, BOTH_TTY)
    expect(agent.kind).toBe('agent')
    expect(agent.detectedBy).toBe('flag')
    expect(agent.interactive).toBe(false)

    for (const flags of [{ json: true }, { format: 'text' }, { format: 'json' }, { accept: 'text/plain' }] as GlobalFlags[]) {
      const c = resolveCaller(flags, {}, BOTH_TTY)
      expect(c.detectedBy).toBe('flag')
      expect(c.interactive).toBe(false)
    }

    expect(resolveCaller({ json: true }, {}, BOTH_TTY).interactive).toBe(false)
  })

  test('(e) confident human (both TTYs, no env, no CI, no flag) → HUMAN, tty, INTERACTIVE', () => {
    const c = resolveCaller(NO_FLAGS, {}, BOTH_TTY)
    expect(c.kind).toBe('human')
    expect(c.detectedBy).toBe('tty')
    expect(c.harness).toBeNull()
    expect(c.interactive).toBe(true) // the ONLY interactive rung in the whole matrix
  })

  test('agent env still beats a real TTY even when a flag ALSO forces json (env-attributed, non-interactive)', () => {
    const c = resolveCaller({ json: true }, { CURSOR_AGENT: '1' }, BOTH_TTY)
    expect(c.kind).toBe('agent')
    expect(c.detectedBy).toBe('env')
    expect(c.interactive).toBe(false)
  })

  test('agent env outranks CI in attribution (env is checked first)', () => {
    const c = resolveCaller(NO_FLAGS, { CI: '1', GEMINI_CLI: '1' }, BOTH_TTY)
    expect(c.detectedBy).toBe('env')
    expect(c.harness).toBe('GEMINI_CLI')
  })

  test('the returned Caller is frozen', () => {
    expect(Object.isFrozen(resolveCaller(NO_FLAGS, {}, BOTH_TTY))).toBe(true)
  })
})

describe('NEVER-HANG: interactive requires EVERY confident-human clause', () => {
  test('a missing stdin TTY defeats interactive', () => {
    expect(resolveCaller(NO_FLAGS, {}, { stdinTTY: false, stdoutTTY: true }).interactive).toBe(false)
  })
  test('a missing stdout TTY defeats interactive', () => {
    expect(resolveCaller(NO_FLAGS, {}, { stdinTTY: true, stdoutTTY: false }).interactive).toBe(false)
  })
  test('any agent env defeats interactive', () => {
    for (const m of AGENT_ENV_MARKERS) {
      expect(resolveCaller(NO_FLAGS, { [m]: '1' }, BOTH_TTY).interactive).toBe(false)
    }
    expect(resolveCaller(NO_FLAGS, { CODEX_SANDBOX: '1' }, BOTH_TTY).interactive).toBe(false)
  })
  test('CI defeats interactive', () => {
    for (const m of CI_MARKERS) {
      expect(resolveCaller(NO_FLAGS, { [m]: '1' }, BOTH_TTY).interactive).toBe(false)
    }
  })
  test('no-TTY-at-all is never interactive under any env', () => {
    expect(resolveCaller(NO_FLAGS, {}, NO_TTY).interactive).toBe(false)
  })
})

describe('marker detection', () => {
  test('every agent marker is detected by name', () => {
    for (const m of AGENT_ENV_MARKERS) {
      expect(detectAgentEnv({ [m]: '1' })).toBe(m)
    }
  })
  test('the issue-mandated markers are all in the table', () => {
    for (const m of ['CLAUDECODE', 'CURSOR_AGENT', 'GEMINI_CLI', 'OPENCODE', 'AI_AGENT', 'AGENT']) {
      expect(AGENT_ENV_MARKERS as readonly string[]).toContain(m)
    }
  })
  test('the CODEX_* PREFIX is detected', () => {
    expect(detectAgentEnv({ CODEX_HOME: '/x' })).toBe('CODEX_HOME')
  })
  test('an EMPTY marker value does not trip detection (a bare FOO= is not set)', () => {
    expect(detectAgentEnv({ CLAUDECODE: '' })).toBeNull()
    expect(detectAgentEnv({ CODEX_HOME: '' })).toBeNull()
    expect(detectCI({ CI: '' })).toBeNull()
  })
  test('no markers → null (a clean human shell)', () => {
    expect(detectAgentEnv({ HOME: '/h', PATH: '/bin' })).toBeNull()
    expect(detectCI({ HOME: '/h' })).toBeNull()
  })
  test('CI markers are detected', () => {
    expect(detectCI({ CI: 'true' })).toBe('CI')
    expect(detectCI({ GITHUB_ACTIONS: 'true' })).toBe('GITHUB_ACTIONS')
  })
})
