/**
 * The Ink viewer for the `@mdxe/tui` seam.
 *
 * Ink is the shell, never the renderer: every frame arrives as finished register bytes (from
 * `@mdxui/text`) and is laid out through Ink 7's `renderToString`; input is decoded by the seam's
 * shared abstraction and mapped through the shared keymap. The viewer never invents or changes a
 * byte, never attaches to a pipe, and imports `ink`/`react` only inside `mount()` — a host that
 * routes an agent to plain bytes never pays for the framework.
 *
 * Read `@mdxe/tui/stub` first: this file is that one with Ink in the middle.
 */

import type { Action, FrameStream, MountHandle, Viewer, ViewerInput } from '@mdxe/tui'
import { ViewerError, assertAttachable, createInputSource, defaultKeymap, frameToString } from '@mdxe/tui'
// Type-only: erased at runtime, so neither module is loaded until `loadInk()` runs inside `mount()`.
import type * as InkModule from 'ink'
import type * as ReactModule from 'react'

/** The slice of Ink and React the viewer uses, loaded once on first mount. */
export interface InkRuntime {
  readonly ink: Pick<typeof InkModule, 'renderToString' | 'Text'>
  readonly react: Pick<typeof ReactModule, 'createElement'>
}

export interface InkViewerOptions {
  /**
   * Fixed layout width for Ink. By default each paint reads `terminal.stdout.columns` (so a
   * resize is honoured) and falls back to {@link DEFAULT_COLUMNS}. Ink's layout cost grows with
   * the width, so a huge value to "disable wrapping" is not an option — wrapping is prevented by
   * the verbatim fallback in {@link paint} instead.
   */
  readonly columns?: number
}

/** Layout width when the terminal does not report one. */
export const DEFAULT_COLUMNS = 80

const CLEAR = '\x1b[2J\x1b[H'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'

let runtime: Promise<InkRuntime> | null = null

/** Import `ink` and `react`. Only `mount()` calls this, so importing `@mdxe/ink` loads neither. */
export function loadInk(): Promise<InkRuntime> {
  runtime ??= Promise.all([import('ink'), import('react')]).then(([ink, react]) => ({ ink, react }))
  return runtime
}

export interface Painted {
  /** What goes to stdout: a clear-screen followed by the frame. */
  readonly bytes: string
  /**
   * `ink` when Ink laid the frame out byte-for-byte. `verbatim` when Ink would have altered a
   * byte — it trims trailing whitespace per line and wraps lines wider than `columns` — and the
   * register bytes were written as-is instead. Either way `stripAnsi(bytes) === frame`.
   */
  readonly engine: 'ink' | 'verbatim'
}

/** Lay one frame out with Ink. Pure. The seam invariant holds whichever engine is used. */
export function paint(frame: string, rt: InkRuntime, columns: number = DEFAULT_COLUMNS): Painted {
  const laid = rt.ink.renderToString(rt.react.createElement(rt.ink.Text, null, frame), { columns })
  if (laid === frame) return { bytes: CLEAR + laid, engine: 'ink' }
  return { bytes: CLEAR + frame, engine: 'verbatim' }
}

export function createInkViewer(options: InkViewerOptions = {}): Viewer {
  let mounting = false
  let teardown: (() => Promise<void>) | null = null

  const viewer: Viewer = {
    name: 'ink',

    async mount(stream: FrameStream, input: ViewerInput): Promise<MountHandle> {
      if (mounting || teardown) throw new ViewerError('ALREADY_MOUNTED', 'ink: already mounted')
      // The TTY guard runs before Ink is even imported: a pipe never loads the framework.
      assertAttachable(input.terminal, 'ink')
      mounting = true
      let rt: InkRuntime
      try {
        rt = await loadInk()
      } finally {
        mounting = false
      }

      const { terminal } = input
      const width = (): number => options.columns ?? terminal.stdout.columns ?? DEFAULT_COLUMNS
      const keymap = input.keymap ?? defaultKeymap
      const ownSource = input.events ? null : createInputSource(terminal)
      const events = input.events ?? ownSource!
      const listeners = new Set<(a: Action) => void>()
      const paintWaiters: Array<() => void> = []
      let painted = 0
      let live = true

      const rawModeOn = typeof terminal.stdin.setRawMode === 'function'
      if (rawModeOn) terminal.stdin.setRawMode!(true)
      terminal.stdout.write(HIDE_CURSOR)

      const frames = stream[Symbol.asyncIterator]()
      const inputs = events[Symbol.asyncIterator]()

      // Unmount must never wait on a source that may never yield again: every pull races a stop signal.
      let stop!: () => void
      const stopped = new Promise<IteratorResult<never>>((resolve) => {
        stop = () => resolve({ value: undefined as never, done: true })
      })

      const framePump = (async () => {
        for (;;) {
          const r = await Promise.race([frames.next(), stopped])
          if (r.done || !live) break
          terminal.stdout.write(paint(frameToString(r.value), rt, width()).bytes)
          painted++
          for (const w of paintWaiters.splice(0)) w()
        }
      })()

      const inputPump = (async () => {
        for (;;) {
          const r = await Promise.race([inputs.next(), stopped])
          if (r.done || !live) break
          const action = keymap(r.value)
          if (!action) continue
          for (const l of listeners) l(action)
          if (action.type === 'quit') void viewer.unmount()
        }
      })()

      teardown = async () => {
        live = false
        stop()
        await Promise.allSettled([framePump, inputPump])
        // Release the sources without awaiting them: a generator parked on an await cannot honour return().
        void Promise.allSettled([frames.return?.(), inputs.return?.()])
        ownSource?.close()
        terminal.stdout.write(SHOW_CURSOR)
        if (rawModeOn) terminal.stdin.setRawMode!(false)
      }

      return {
        get painted() {
          return painted
        },
        nextPaint: () => new Promise<void>((resolve) => paintWaiters.push(resolve)),
        onAction(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    },

    async unmount() {
      const t = teardown
      teardown = null
      if (t) await t()
    },
  }

  return viewer
}

export default createInkViewer
