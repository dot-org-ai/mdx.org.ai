/**
 * Input abstraction: raw terminal bytes → {@link InputEvent}s → {@link Action}s.
 *
 * `decodeInput` is pure so every viewer decodes identically; `defaultKeymap` is the one
 * mapping the conformance suite checks against. A viewer that wants different bindings
 * takes a `keymap` on mount rather than hard-coding its own.
 */

import type { Action, InputEvent, InputSource, KeyEvent, KeyName, Keymap, Terminal } from './types'

const ESC = '\x1b'
const PASTE_START = `${ESC}[200~`
const PASTE_END = `${ESC}[201~`

const CSI_KEYS: Readonly<Record<string, KeyName>> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
  '1~': 'home',
  '4~': 'end',
  '3~': 'delete',
  '5~': 'pageup',
  '6~': 'pagedown',
}

const key = (name: KeyName | string, mods: Partial<Omit<KeyEvent, 'type' | 'key'>> = {}): KeyEvent => ({
  type: 'key',
  key: name,
  ctrl: mods.ctrl ?? false,
  meta: mods.meta ?? false,
  shift: mods.shift ?? false,
})

const decoder = new TextDecoder()

/** Decode one chunk of terminal input into events. Pure; unknown sequences are dropped. */
export function decodeInput(chunk: Uint8Array | string): InputEvent[] {
  const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk)
  const events: InputEvent[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]!
    if (text.startsWith(PASTE_START, i)) {
      const end = text.indexOf(PASTE_END, i + PASTE_START.length)
      const stop = end === -1 ? text.length : end
      events.push({ type: 'paste', text: text.slice(i + PASTE_START.length, stop) })
      i = end === -1 ? text.length : end + PASTE_END.length
      continue
    }
    if (c === ESC) {
      if (text[i + 1] === '[') {
        const m = /^\[(\d*(?:;\d+)*)?([@-~])/.exec(text.slice(i + 1))
        if (m) {
          const params = m[1] ?? ''
          const final = m[2]!
          const name = CSI_KEYS[final === '~' ? `${params}~` : final]
          if (name) events.push(key(name, { shift: params.endsWith(';2') }))
          i += 1 + m[0].length
          continue
        }
      }
      if (i + 1 < text.length && text[i + 1] !== '[') {
        // ESC-prefixed printable = meta/alt chord
        events.push(key(text[i + 1]!, { meta: true }))
        i += 2
        continue
      }
      events.push(key('escape'))
      i += 1
      continue
    }
    const code = c.charCodeAt(0)
    if (c === '\r' || c === '\n') events.push(key('enter'))
    else if (c === '\t') events.push(key('tab'))
    else if (c === '\x7f' || c === '\b') events.push(key('backspace'))
    else if (c === ' ') events.push(key('space'))
    else if (code < 0x20) events.push(key(String.fromCharCode(code + 0x60), { ctrl: true }))
    else events.push(key(c, { shift: c !== c.toLowerCase() && c === c.toUpperCase() }))
    i += 1
  }
  return events
}

/** The shared mapping every viewer conforms to. */
export const defaultKeymap: Keymap = (event) => {
  if (event.type === 'paste') return { type: 'insert', text: event.text }
  if (event.type === 'resize') return { type: 'resize', columns: event.columns, rows: event.rows }
  if (event.ctrl && event.key === 'c') return { type: 'quit' }
  if (event.ctrl && event.key === 'd') return { type: 'quit' }
  if (event.ctrl && event.key === 'u') return { type: 'page', direction: -1 }
  if (event.ctrl && event.key === 'f') return { type: 'page', direction: 1 }
  if (event.ctrl || event.meta) return null
  switch (event.key) {
    case 'q':
    case 'escape':
      return { type: 'quit' }
    case 'up':
    case 'k':
      return { type: 'scroll', lines: -1 }
    case 'down':
    case 'j':
      return { type: 'scroll', lines: 1 }
    case 'pageup':
      return { type: 'page', direction: -1 }
    case 'pagedown':
    case 'space':
      return { type: 'page', direction: 1 }
    case 'home':
    case 'g':
      return { type: 'jump', to: 'top' }
    case 'end':
    case 'G':
      return { type: 'jump', to: 'bottom' }
    case 'enter':
      return { type: 'select' }
    case 'backspace':
    case 'left':
    case 'h':
      return { type: 'back' }
    case '/':
      return { type: 'search' }
    default:
      return null
  }
}

/** Map a batch of events, dropping unbound ones. */
export function mapActions(events: Iterable<InputEvent>, keymap: Keymap = defaultKeymap): Action[] {
  const out: Action[] = []
  for (const e of events) {
    const a = keymap(e)
    if (a) out.push(a)
  }
  return out
}

/** A push queue exposed as an async iterable. Used for input sources and frame streams. */
export function createQueue<T>(): { push(item: T): void; close(): void; iterable: AsyncIterable<T> } {
  const buffer: T[] = []
  const waiters: Array<(r: IteratorResult<T>) => void> = []
  let closed = false
  const push = (item: T): void => {
    if (closed) return
    const w = waiters.shift()
    if (w) w({ value: item, done: false })
    else buffer.push(item)
  }
  const close = (): void => {
    closed = true
    for (const w of waiters.splice(0)) w({ value: undefined as never, done: true })
  }
  const iterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]: () => ({
      next: (): Promise<IteratorResult<T>> => {
        if (buffer.length) return Promise.resolve({ value: buffer.shift()!, done: false })
        if (closed) return Promise.resolve({ value: undefined as never, done: true })
        return new Promise((resolve) => waiters.push(resolve))
      },
      return: (): Promise<IteratorResult<T>> => {
        close()
        return Promise.resolve({ value: undefined as never, done: true })
      },
    }),
  }
  return { push, close, iterable }
}

/** Decode a live terminal into an {@link InputSource}: stdin bytes → keys/pastes, stdout resize → resize. */
export function createInputSource(terminal: Terminal): InputSource & { close(): void } {
  const q = createQueue<InputEvent>()
  const onData = (chunk: Uint8Array | string): void => {
    for (const e of decodeInput(chunk)) q.push(e)
  }
  const onResize = (): void =>
    q.push({ type: 'resize', columns: terminal.stdout.columns ?? 80, rows: terminal.stdout.rows ?? 24 })
  terminal.stdin.on?.('data', onData)
  terminal.stdout.on?.('resize', onResize)
  terminal.stdin.resume?.()
  const close = (): void => {
    terminal.stdin.off?.('data', onData)
    terminal.stdout.off?.('resize', onResize)
    terminal.stdin.pause?.()
    q.close()
  }
  return { [Symbol.asyncIterator]: () => q.iterable[Symbol.asyncIterator](), close }
}
