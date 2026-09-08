import { describe, it, expect } from 'vitest'
import { describeViewerConformance, runConformance, createFakeTerminal, frameFixtures } from './conformance'
import { createStubViewer } from './stub'
import { canAttach } from './tty'
import { ViewerError } from './types'
import type { Viewer } from './types'

// The acceptance criterion: the suite is green against the stub viewer.
describeViewerConformance('stub', () => createStubViewer(), { describe, it })

describe('runConformance', () => {
  it('reports every check ok for the stub', async () => {
    const report = await runConformance(() => createStubViewer())
    expect(report.viewer).toBe('stub')
    expect(report.results.map((r) => r.id)).toEqual([
      'paint-identity',
      'input-actions',
      'refuses-piped-stdout',
      'refuses-piped-stdin',
      'unmount-releases',
      'quit-unmounts',
    ])
    expect(report.ok).toBe(true)
  })

  it('catches a viewer that invents bytes and attaches to pipes', async () => {
    // A cheating viewer: appends a status line, never checks the TTY, keeps raw mode on.
    const cheat = (): Viewer => {
      const inner = createStubViewer()
      return {
        name: 'cheat',
        async mount(stream, input) {
          const decorated = (async function* () {
            for await (const f of stream) yield `${f}-- status --\n`
          })()
          const term = { stdout: { ...input.terminal.stdout, isTTY: true }, stdin: { ...input.terminal.stdin, isTTY: true } }
          const handle = await inner.mount(decorated, { ...input, terminal: term })
          return handle
        },
        unmount: () => inner.unmount(),
      }
    }
    const report = await runConformance(cheat, { timeoutMs: 300 })
    const byId = Object.fromEntries(report.results.map((r) => [r.id, r]))
    expect(report.ok).toBe(false)
    expect(byId['paint-identity']!.ok).toBe(false)
    expect(byId['paint-identity']!.error).toMatch(/differs/)
    expect(byId['refuses-piped-stdout']!.ok).toBe(false)
    expect(byId['refuses-piped-stdin']!.ok).toBe(false)
    expect(byId['input-actions']!.ok).toBe(true)
  })
})

describe('tty guard', () => {
  it('canAttach only when both streams are TTYs', () => {
    expect(canAttach(createFakeTerminal())).toEqual({ ok: true })
    expect(canAttach(createFakeTerminal({ stdoutTTY: false })).ok).toBe(false)
    expect(canAttach(createFakeTerminal({ stdinTTY: false })).ok).toBe(false)
    expect(canAttach({ stdout: { write: () => true }, stdin: {} }).ok).toBe(false)
  })
  it('stub refuses a second mount while mounted', async () => {
    const viewer = createStubViewer()
    const term = createFakeTerminal()
    const empty = { [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<string>>(() => {}) }) }
    await viewer.mount(empty, { terminal: term })
    await expect(viewer.mount(empty, { terminal: term })).rejects.toBeInstanceOf(ViewerError)
    await viewer.unmount()
    expect(term.rawModeCalls).toEqual([true, false])
  })
  it('stub decodes the live terminal when no events are supplied', async () => {
    const viewer = createStubViewer()
    const term = createFakeTerminal()
    const empty = { [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<string>>(() => {}) }) }
    const handle = await viewer.mount(empty, { terminal: term })
    const action = new Promise((resolve) => handle.onAction(resolve))
    term.feed('j')
    expect(await action).toEqual({ type: 'scroll', lines: 1 })
    await viewer.unmount()
  })
  it('fixtures cover the edge cases the seam cares about', () => {
    expect(frameFixtures).toContain('')
    expect(frameFixtures.some((f) => !f.endsWith('\n'))).toBe(true)
    expect(frameFixtures.some((f) => [...f].some((ch) => ch.charCodeAt(0) > 0x7f))).toBe(true)
  })
})
