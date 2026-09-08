/**
 * Conformance suite for {@link Viewer} implementations. Runner-agnostic: `runConformance`
 * returns a report; `describeViewerConformance` is a thin vitest/jest binding.
 *
 * Usage in an implementation package:
 * ```ts
 * import { describeViewerConformance } from '@mdxe/tui/conformance'
 * describeViewerConformance('ink', () => import('./viewer').then(m => m.createInkViewer()), { describe, it, expect })
 * ```
 */

import type { Action, InputEvent, Keymap, MountHandle, Terminal, Viewer, ViewerFactory } from './types'
import { ViewerError } from './types'
import { stripAnsi } from './ansi'
import { createQueue, defaultKeymap, mapActions } from './input'

// ── fake terminal ──────────────────────────────────────────────────────────────────────

export interface FakeTerminalOptions {
  stdoutTTY?: boolean
  stdinTTY?: boolean
  columns?: number
  rows?: number
}

export interface FakeTerminal extends Terminal {
  /** Everything written to stdout so far. */
  output(): string
  /** Return what was written since the last drain and reset. */
  drain(): string
  /** Every `setRawMode` call, in order. */
  readonly rawModeCalls: boolean[]
  /** Feed raw bytes to stdin listeners. */
  feed(bytes: string | Uint8Array): void
  /** Change geometry and fire stdout `resize`. */
  resize(columns: number, rows: number): void
}

export function createFakeTerminal(opts: FakeTerminalOptions = {}): FakeTerminal {
  let written = ''
  let mark = 0
  const rawModeCalls: boolean[] = []
  const dataListeners = new Set<(chunk: Uint8Array | string) => void>()
  const resizeListeners = new Set<() => void>()
  const geometry = { columns: opts.columns ?? 80, rows: opts.rows ?? 24 }
  const stdout: Terminal['stdout'] = {
    isTTY: opts.stdoutTTY ?? true,
    get columns() {
      return geometry.columns
    },
    get rows() {
      return geometry.rows
    },
    write(chunk) {
      written += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
      return true
    },
    on: (_e, l) => resizeListeners.add(l),
    off: (_e, l) => resizeListeners.delete(l),
  }
  const stdin: Terminal['stdin'] = {
    isTTY: opts.stdinTTY ?? true,
    setRawMode: (mode) => {
      rawModeCalls.push(mode)
      return stdin
    },
    on: (_e, l) => dataListeners.add(l),
    off: (_e, l) => dataListeners.delete(l),
  }
  return {
    stdout,
    stdin,
    rawModeCalls,
    output: () => written,
    drain: () => {
      const out = written.slice(mark)
      mark = written.length
      return out
    },
    feed: (bytes) => {
      for (const l of dataListeners) l(bytes)
    },
    resize: (columns, rows) => {
      geometry.columns = columns
      geometry.rows = rows
      for (const l of resizeListeners) l()
    },
  }
}

// ── fixtures ───────────────────────────────────────────────────────────────────────────

/** Plain register bytes as `@mdxui/text` would emit them: markdown, tables, unicode, blank lines. */
export const frameFixtures: readonly string[] = [
  '# Hello\n\nA paragraph with **bold** and `code`.\n',
  '| a | b |\n|---|---|\n| 1 | 2 |\n\n- one\n- two\n  - nested\n',
  'unicode ✓ — “quotes” · 日本語\n\n\n\ntrailing blanks\n',
  '',
  'no trailing newline',
]

const k = (key: string, mods: Partial<Pick<InputEvent & { type: 'key' }, 'ctrl' | 'meta' | 'shift'>> = {}): InputEvent => ({
  type: 'key',
  key,
  ctrl: false,
  meta: false,
  shift: false,
  ...mods,
})

/** Key, paste and resize events every viewer must map identically. Contains no `quit`. */
export const inputFixtures: readonly InputEvent[] = [
  k('down'),
  k('j'),
  k('up'),
  k('pagedown'),
  k('space'),
  k('u', { ctrl: true }),
  k('g'),
  k('G'),
  k('enter'),
  k('left'),
  k('/'),
  k('x'), // unbound → no action
  k('c', { meta: true }), // unbound chord → no action
  { type: 'paste', text: 'pasted text\nwith newline' },
  { type: 'resize', columns: 120, rows: 40 },
]

// ── checks ─────────────────────────────────────────────────────────────────────────────

export interface ConformanceOptions {
  frames?: readonly string[]
  events?: readonly InputEvent[]
  keymap?: Keymap
  /** Per-check timeout in ms. */
  timeoutMs?: number
}

export interface ConformanceCheck {
  readonly id: string
  readonly title: string
  run(): Promise<void>
}

export interface ConformanceResult {
  readonly id: string
  readonly title: string
  readonly ok: boolean
  readonly error?: string
}

export interface ConformanceReport {
  readonly viewer: string
  readonly ok: boolean
  readonly results: readonly ConformanceResult[]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms: ${label}`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

async function mounted(
  factory: ViewerFactory,
  events: AsyncIterable<InputEvent>,
  keymap: Keymap | undefined,
  term: FakeTerminal,
): Promise<{ viewer: Viewer; handle: MountHandle; push(frame: string): void; close(): void }> {
  const viewer = await factory()
  const frames = createQueue<string>()
  const handle = await viewer.mount(frames.iterable, { terminal: term, events, keymap })
  return { viewer, handle, push: frames.push, close: frames.close }
}

/** Build the checks for a viewer. Each check constructs a fresh viewer and fake terminal. */
export function conformanceChecks(factory: ViewerFactory, opts: ConformanceOptions = {}): ConformanceCheck[] {
  const frames = opts.frames ?? frameFixtures
  const events = opts.events ?? inputFixtures
  const keymap = opts.keymap ?? defaultKeymap
  const timeoutMs = opts.timeoutMs ?? 2000
  const eventsOf = (list: readonly InputEvent[]) => {
    const q = createQueue<InputEvent>()
    for (const e of list) q.push(e)
    return q
  }

  return [
    {
      id: 'paint-identity',
      title: 'strip(paint(bytes)) === bytes for every fixture frame',
      async run() {
        const term = createFakeTerminal()
        const m = await mounted(factory, eventsOf([]).iterable, keymap, term)
        try {
          term.drain()
          for (const frame of frames) {
            const painted = m.handle.nextPaint()
            m.push(frame)
            await withTimeout(painted, timeoutMs, 'nextPaint')
            const got = stripAnsi(term.drain())
            assert(got === frame, `painted frame differs from register bytes\n expected: ${JSON.stringify(frame)}\n got:      ${JSON.stringify(got)}`)
          }
          assert(m.handle.painted === frames.length, `painted ${m.handle.painted} frames, expected ${frames.length}`)
        } finally {
          await m.viewer.unmount()
        }
      },
    },
    {
      id: 'input-actions',
      title: 'key, paste and resize events map to the same actions as the shared keymap',
      async run() {
        const term = createFakeTerminal()
        const expected = mapActions(events, keymap)
        const q = createQueue<InputEvent>()
        const m = await mounted(factory, q.iterable, keymap, term)
        try {
          const got: Action[] = []
          const done = new Promise<void>((resolve) => {
            m.handle.onAction((a) => {
              got.push(a)
              if (got.length >= expected.length) resolve()
            })
          })
          for (const e of events) q.push(e)
          await withTimeout(done, timeoutMs, `waiting for ${expected.length} actions`)
          await tick()
          assert(
            JSON.stringify(got) === JSON.stringify(expected),
            `actions differ\n expected: ${JSON.stringify(expected)}\n got:      ${JSON.stringify(got)}`,
          )
        } finally {
          await m.viewer.unmount()
        }
      },
    },
    {
      id: 'refuses-piped-stdout',
      title: 'never attaches when stdout is not a TTY: rejects NOT_A_TTY, writes nothing, never enters raw mode',
      async run() {
        await refuses(factory, createFakeTerminal({ stdoutTTY: false }), keymap)
      },
    },
    {
      id: 'refuses-piped-stdin',
      title: 'never attaches when stdin is not a TTY (raw mode fails open on pipes)',
      async run() {
        await refuses(factory, createFakeTerminal({ stdinTTY: false }), keymap)
      },
    },
    {
      id: 'unmount-releases',
      title: 'unmount releases raw mode and nothing is painted afterwards',
      async run() {
        const term = createFakeTerminal()
        const m = await mounted(factory, eventsOf([]).iterable, keymap, term)
        const painted = m.handle.nextPaint()
        m.push(frames[0] ?? 'x\n')
        await withTimeout(painted, timeoutMs, 'nextPaint')
        await m.viewer.unmount()
        const ons = term.rawModeCalls.filter(Boolean).length
        const offs = term.rawModeCalls.length - ons
        assert(ons === offs, `raw mode entered ${ons}x but released ${offs}x`)
        assert(term.rawModeCalls.at(-1) !== true, 'last setRawMode call must be false')
        term.drain()
        m.push('after unmount\n')
        await tick()
        await tick()
        assert(term.drain() === '', 'viewer wrote to stdout after unmount')
        await m.viewer.unmount() // idempotent
      },
    },
    {
      id: 'quit-unmounts',
      title: 'a quit action (ctrl-c) unmounts the viewer and releases raw mode',
      async run() {
        const term = createFakeTerminal()
        const q = createQueue<InputEvent>()
        const m = await mounted(factory, q.iterable, keymap, term)
        const quit = new Promise<void>((resolve) => m.handle.onAction((a) => a.type === 'quit' && resolve()))
        q.push(k('c', { ctrl: true }))
        await withTimeout(quit, timeoutMs, 'quit action')
        await tick()
        await tick()
        assert(term.rawModeCalls.at(-1) !== true, 'raw mode still on after quit')
        await m.viewer.unmount()
      },
    },
  ]
}

async function refuses(factory: ViewerFactory, term: FakeTerminal, keymap: Keymap): Promise<void> {
  const viewer = await factory()
  const frames = createQueue<string>()
  frames.push('should never be painted\n')
  let error: unknown
  try {
    await viewer.mount(frames.iterable, { terminal: term, events: createQueue<InputEvent>().iterable, keymap })
  } catch (e) {
    error = e
  }
  assert(error instanceof ViewerError, 'mount must reject with a ViewerError')
  assert(error.code === 'NOT_A_TTY', `expected code NOT_A_TTY, got ${error.code}`)
  await tick()
  assert(term.output() === '', `viewer wrote ${JSON.stringify(term.output())} to a non-TTY`)
  assert(term.rawModeCalls.length === 0, 'viewer touched raw mode on a non-TTY')
  await viewer.unmount()
}

/** Run every check and collect a report. Never throws. */
export async function runConformance(factory: ViewerFactory, opts: ConformanceOptions = {}): Promise<ConformanceReport> {
  const viewer = await factory()
  const results: ConformanceResult[] = []
  for (const check of conformanceChecks(factory, opts)) {
    try {
      await check.run()
      results.push({ id: check.id, title: check.title, ok: true })
    } catch (e) {
      results.push({ id: check.id, title: check.title, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { viewer: viewer.name, ok: results.every((r) => r.ok), results }
}

/** Minimal runner surface shared by vitest, jest and bun:test. */
export interface TestHarness {
  describe(name: string, fn: () => void): unknown
  it(name: string, fn: () => Promise<void>, timeout?: number): unknown
}

/** Bind the checks to a test runner so each check is its own test case. */
export function describeViewerConformance(
  name: string,
  factory: ViewerFactory,
  harness: TestHarness,
  opts: ConformanceOptions = {},
): void {
  harness.describe(`viewer conformance: ${name}`, () => {
    for (const check of conformanceChecks(factory, opts)) {
      harness.it(`${check.id} — ${check.title}`, () => check.run(), (opts.timeoutMs ?? 2000) * 2)
    }
  })
}
