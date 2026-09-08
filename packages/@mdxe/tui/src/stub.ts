/**
 * The reference viewer. It paints each frame with SGR bold per line behind a clear-screen,
 * proving the seam invariant strip(paint(bytes)) === bytes; it maps input through the shared
 * keymap; it refuses to attach off a TTY; it releases raw mode on unmount.
 *
 * Ink and OpenTUI viewers should read like this file with a framework in the middle.
 */

import type { Action, FrameStream, MountHandle, Viewer, ViewerInput } from './types'
import { ViewerError } from './types'
import { frameToString } from './ansi'
import { createInputSource, defaultKeymap } from './input'
import { assertAttachable } from './tty'

const CLEAR = '\x1b[2J\x1b[H'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'

/** Wrap each line in bold; pure and byte-preserving under `stripAnsi`. */
export function paint(frame: string): string {
  return CLEAR + frame.replace(/[^\n]+/g, (line) => `\x1b[1m${line}\x1b[22m`)
}

export function createStubViewer(): Viewer {
  let teardown: (() => Promise<void>) | null = null

  const viewer: Viewer = {
    name: 'stub',

    async mount(stream: FrameStream, input: ViewerInput): Promise<MountHandle> {
      if (teardown) throw new ViewerError('ALREADY_MOUNTED', 'stub: already mounted')
      assertAttachable(input.terminal, 'stub')

      const { terminal } = input
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
          terminal.stdout.write(paint(frameToString(r.value)))
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

export default createStubViewer
