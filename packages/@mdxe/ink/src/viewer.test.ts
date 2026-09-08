import { describe, it, expect, vi } from 'vitest'
import { describeViewerConformance, runConformance, createFakeTerminal, frameFixtures } from '@mdxe/tui/conformance'
import { ViewerError, createQueue, stripAnsi } from '@mdxe/tui'
import type { InputEvent } from '@mdxe/tui'

// Record when the framework modules are first evaluated. The factories run on first import, so
// a static `import 'ink'` anywhere in the package would flip these before any test runs.
const loaded = vi.hoisted(() => ({ ink: false, react: false }))
vi.mock('ink', async (importOriginal) => {
  loaded.ink = true
  return importOriginal()
})
vi.mock('react', async (importOriginal) => {
  loaded.react = true
  return importOriginal()
})

import { createInkViewer, inkViewer, loadInk, paint, DEFAULT_COLUMNS } from './index'

const pending = { [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<string>>(() => {}) }) }

describe('lazy entrypoint', () => {
  it('importing @mdxe/ink and creating a viewer loads neither ink nor react', () => {
    const viewer = createInkViewer()
    expect(viewer.name).toBe('ink')
    expect(loaded).toEqual({ ink: false, react: false })
  })

  it('a non-TTY stdout is refused with a stable NOT_A_TTY code before ink is loaded', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal({ stdoutTTY: false })
    let error: unknown
    try {
      await viewer.mount(createQueue<string>().iterable, { terminal: term })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ViewerError)
    expect(error).toMatchObject({ name: 'ViewerError', code: 'NOT_A_TTY' })
    expect((error as Error).message).toMatch(/stdout is not a TTY/)
    expect(term.output()).toBe('')
    expect(term.rawModeCalls).toEqual([])
    expect(loaded).toEqual({ ink: false, react: false })
  })

  it('mount() on a TTY is what loads ink and react', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal()
    await viewer.mount(pending, { terminal: term, events: createQueue<InputEvent>().iterable })
    expect(loaded).toEqual({ ink: true, react: true })
    await viewer.unmount()
    expect(term.rawModeCalls).toEqual([true, false])
  })

  it('inkViewer() is a ViewerFactory over the same viewer', async () => {
    const viewer = await inkViewer()()
    expect(viewer.name).toBe('ink')
  })
})

describeViewerConformance('ink', () => createInkViewer(), { describe, it })

describe('runConformance', () => {
  it('reports every check ok', async () => {
    const report = await runConformance(() => createInkViewer())
    expect(report.viewer).toBe('ink')
    expect(report.results.filter((r) => !r.ok)).toEqual([])
    expect(report.ok).toBe(true)
  })
})

describe('paint', () => {
  it('lays every fixture frame out through Ink byte-for-byte', async () => {
    const rt = await loadInk()
    for (const frame of frameFixtures) {
      const p = paint(frame, rt)
      expect(p.engine, JSON.stringify(frame)).toBe('ink')
      expect(stripAnsi(p.bytes)).toBe(frame)
    }
  })

  it('never wraps: a line wider than the terminal keeps its bytes (verbatim fallback)', async () => {
    const rt = await loadInk()
    const frame = `${'x'.repeat(200)}\nshort\n`
    const p = paint(frame, rt, DEFAULT_COLUMNS)
    expect(p.engine).toBe('verbatim')
    expect(stripAnsi(p.bytes)).toBe(frame)
  })

  it('falls back to the register bytes when Ink would alter one', async () => {
    const rt = await loadInk()
    // Ink trims trailing whitespace per line and wraps at `columns`; neither may reach the screen.
    for (const [frame, columns] of [
      ['trailing  \nspaces \n', DEFAULT_COLUMNS],
      ['a line that is wider than ten columns\n', 10],
    ] as const) {
      const p = paint(frame, rt, columns)
      expect(p.engine).toBe('verbatim')
      expect(stripAnsi(p.bytes)).toBe(frame)
    }
  })

  it('lays out at terminal width: a paint is cheap (Ink layout cost grows with columns)', async () => {
    // A 1 << 20 "never wrap" width costs ~1s per frame through Yoga; 80 columns costs well under 1ms.
    const rt = await loadInk()
    const frame = frameFixtures[0]!
    paint(frame, rt, DEFAULT_COLUMNS) // warm
    const t = performance.now()
    for (let i = 0; i < 20; i++) paint(frame, rt, DEFAULT_COLUMNS)
    expect((performance.now() - t) / 20).toBeLessThan(50)
  })
})

describe('layout width', () => {
  it('follows the terminal across a resize; a line wider than it goes verbatim, never wrapped', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal({ columns: 40 })
    const frames = createQueue<string>()
    const handle = await viewer.mount(frames.iterable, { terminal: term, events: createQueue<InputEvent>().iterable })
    const wide = `${'w'.repeat(60)}\n`
    term.drain()
    let painted = handle.nextPaint()
    frames.push(wide) // 60 > 40: Ink would wrap → verbatim
    await painted
    expect(stripAnsi(term.drain())).toBe(wide)
    term.resize(120, 40)
    painted = handle.nextPaint()
    frames.push(wide) // 60 < 120: laid out by Ink
    await painted
    expect(stripAnsi(term.drain())).toBe(wide)
    await viewer.unmount()
  })

  it('an explicit columns option pins the width', async () => {
    const rt = await loadInk()
    expect(paint('short\n', rt, 3).engine).toBe('verbatim')
    expect(paint('short\n', rt, 10).engine).toBe('ink')
  })
})

describe('mount guards', () => {
  it('refuses a second mount while mounted', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal()
    await viewer.mount(pending, { terminal: term, events: createQueue<InputEvent>().iterable })
    await expect(viewer.mount(pending, { terminal: term })).rejects.toMatchObject({ code: 'ALREADY_MOUNTED' })
    await viewer.unmount()
    expect(term.rawModeCalls).toEqual([true, false])
  })

  it('refuses a piped stdin too', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal({ stdinTTY: false })
    await expect(viewer.mount(pending, { terminal: term })).rejects.toMatchObject({ code: 'NOT_A_TTY' })
    expect(term.output()).toBe('')
  })

  it('decodes the live terminal when no events are supplied', async () => {
    const viewer = createInkViewer()
    const term = createFakeTerminal()
    const handle = await viewer.mount(pending, { terminal: term })
    const action = new Promise((resolve) => handle.onAction(resolve))
    term.feed('j')
    expect(await action).toEqual({ type: 'scroll', lines: 1 })
    await viewer.unmount()
  })
})
