/**
 * cli/orient — the bare-invocation orientation: a scalar contract object, commands grouped by task
 * (never an alphabetical dump), rendered identically-in-data across text/json/human, pointing AT
 * `mdxe help`. stdout only, stdin never, exit 0.
 */

import { describe, expect, test } from 'vitest'

import { buildOrientation, renderOrientation, orientCommand, TASK_GROUPS } from './orient.js'
import type { OutputCtx } from '@mdxe/cli-core'
import type { Caller } from '@mdxe/cli-core'

const TEXT_CTX: OutputCtx = { mode: 'text', color: false, width: Infinity, interactive: false, stream: false }
const JSON_CTX: OutputCtx = { mode: 'json', color: false, width: Infinity, interactive: false, stream: false }
const HUMAN_CTX: OutputCtx = { mode: 'human', color: true, width: 80, interactive: true, stream: true }
const AGENT: Caller = { kind: 'agent', harness: 'CLAUDECODE', detectedBy: 'env', interactive: false }
const HUMAN: Caller = { kind: 'human', harness: null, detectedBy: 'tty', interactive: true }

/** Every verb `cli.ts` dispatches (the `CliOptions.command` union minus the meta words). */
const DISPATCHED_VERBS = ['dev', 'build', 'start', 'deploy', 'test', 'run', 'notebook', 'tail', 'db', 'db:server', 'db:client', 'db:publish']

describe('buildOrientation — the contract object', () => {
  test('carries scalars only, grouped by task, and attributes the caller', () => {
    const o = buildOrientation('1.2.3', AGENT)
    expect(o.name).toBe('mdxe')
    expect(o.version).toBe('1.2.3')
    expect(o.caller).toEqual({ kind: 'agent', harness: 'CLAUDECODE', detectedBy: 'env' })
    expect(Object.isFrozen(o)).toBe(true)
    for (const g of o.groups) {
      expect(g.task.length).toBeGreaterThan(0)
      for (const c of g.commands) {
        expect(c.verb).not.toContain('\n')
        expect(c.purpose).not.toContain('\n')
      }
    }
  })

  test('every dispatched verb appears exactly once; nothing is invented', () => {
    const verbs = TASK_GROUPS.flatMap((g) => g.commands.map((c) => c.verb))
    expect([...verbs].sort()).toEqual([...DISPATCHED_VERBS].sort())
    expect(new Set(verbs).size).toBe(verbs.length)
  })

  test('grouped by TASK, never alphabetical', () => {
    const verbs = TASK_GROUPS.flatMap((g) => g.commands.map((c) => c.verb))
    expect(verbs).not.toEqual([...verbs].sort())
    expect(TASK_GROUPS.length).toBeGreaterThanOrEqual(3)
  })

  test('points AT help (the orientation is not the help)', () => {
    expect(buildOrientation('0', AGENT).next).toContain('mdxe help')
  })
})

describe('renderOrientation — same data, three skins', () => {
  test('text: tab-separated lines, no ANSI, ends with a newline', () => {
    const out = renderOrientation(buildOrientation('1.2.3', AGENT), TEXT_CTX, AGENT)
    expect(out).not.toContain('\x1b[')
    expect(out.endsWith('\n')).toBe(true)
    expect(out).toContain('mdxe\tversion=1.2.3\tcaller=agent\tdetected=env')
    expect(out).toContain('command\tdevelop\tdev\t')
    expect(out).toContain('next\tmdxe help')
  })

  test('json: the contract object verbatim, one line', () => {
    const o = buildOrientation('1.2.3', AGENT)
    const out = renderOrientation(o, JSON_CTX, AGENT)
    expect(out.trim().split('\n')).toHaveLength(1)
    expect(JSON.parse(out)).toEqual(JSON.parse(JSON.stringify(o)))
  })

  test('human: colored when ctx.color, plain otherwise; a confident human sees the opening-view banner', () => {
    const o = buildOrientation('1.2.3', HUMAN)
    const colored = renderOrientation(o, HUMAN_CTX, HUMAN)
    expect(colored).toContain('\x1b[')
    expect(colored).toContain('opening view')
    const plain = renderOrientation(o, { ...HUMAN_CTX, color: false }, { ...HUMAN, interactive: false })
    expect(plain).not.toContain('\x1b[')
    expect(plain).not.toContain('opening view')
    expect(plain).toContain('mdxe help')
  })

  test('the three skins carry the SAME verbs', () => {
    const o = buildOrientation('1.2.3', AGENT)
    for (const ctx of [TEXT_CTX, JSON_CTX, HUMAN_CTX]) {
      const out = renderOrientation(o, ctx, AGENT)
      for (const v of DISPATCHED_VERBS) expect(out).toContain(v)
    }
  })
})

describe('orientCommand — stdout only, exit 0, synchronous', () => {
  test('writes exactly one payload to the sink and returns 0', () => {
    const chunks: string[] = []
    const code = orientCommand(TEXT_CTX, AGENT, '1.2.3', { write: (s) => void chunks.push(s) })
    expect(code).toBe(0)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('caller=agent')
  })
})
