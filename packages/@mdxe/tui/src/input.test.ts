import { describe, it, expect } from 'vitest'
import { decodeInput, defaultKeymap, mapActions, createInputSource, createQueue } from './input'
import { createFakeTerminal, inputFixtures } from './conformance'
import type { InputEvent } from './types'

const key = (k: string, mods: Partial<{ ctrl: boolean; meta: boolean; shift: boolean }> = {}) => ({
  type: 'key' as const,
  key: k,
  ctrl: false,
  meta: false,
  shift: false,
  ...mods,
})

describe('decodeInput', () => {
  it('decodes named keys', () => {
    expect(decodeInput('\x1b[A\x1b[B\x1b[C\x1b[D')).toEqual([key('up'), key('down'), key('right'), key('left')])
    expect(decodeInput('\x1b[5~\x1b[6~\x1b[H\x1b[F\x1b[1~\x1b[4~\x1b[3~')).toEqual([
      key('pageup'),
      key('pagedown'),
      key('home'),
      key('end'),
      key('home'),
      key('end'),
      key('delete'),
    ])
    expect(decodeInput('\r\n\t\x7f\b \x1b')).toEqual([
      key('enter'),
      key('enter'),
      key('tab'),
      key('backspace'),
      key('backspace'),
      key('space'),
      key('escape'),
    ])
  })
  it('decodes control and meta chords and printable characters', () => {
    expect(decodeInput('\x03\x04\x15')).toEqual([key('c', { ctrl: true }), key('d', { ctrl: true }), key('u', { ctrl: true })])
    expect(decodeInput('\x1bx')).toEqual([key('x', { meta: true })])
    expect(decodeInput('aG/')).toEqual([key('a'), key('G', { shift: true }), key('/')])
    expect(decodeInput('\x1b[1;2A')).toEqual([key('up', { shift: true })])
  })
  it('delivers bracketed paste whole, mixed with keys', () => {
    expect(decodeInput('j\x1b[200~multi\nline\x1b[201~k')).toEqual([
      key('j'),
      { type: 'paste', text: 'multi\nline' },
      key('k'),
    ])
  })
  it('drops unknown CSI sequences and accepts bytes', () => {
    expect(decodeInput('\x1b[99Z')).toEqual([])
    expect(decodeInput(new TextEncoder().encode('q'))).toEqual([key('q')])
  })
})

describe('defaultKeymap', () => {
  it('maps the fixture events deterministically', () => {
    expect(mapActions(inputFixtures)).toEqual([
      { type: 'scroll', lines: 1 },
      { type: 'scroll', lines: 1 },
      { type: 'scroll', lines: -1 },
      { type: 'page', direction: 1 },
      { type: 'page', direction: 1 },
      { type: 'page', direction: -1 },
      { type: 'jump', to: 'top' },
      { type: 'jump', to: 'bottom' },
      { type: 'select' },
      { type: 'back' },
      { type: 'search' },
      { type: 'insert', text: 'pasted text\nwith newline' },
      { type: 'resize', columns: 120, rows: 40 },
    ])
  })
  it('quits on q, escape, ctrl-c, ctrl-d', () => {
    for (const e of [key('q'), key('escape'), key('c', { ctrl: true }), key('d', { ctrl: true })]) {
      expect(defaultKeymap(e)).toEqual({ type: 'quit' })
    }
  })
})

describe('createInputSource', () => {
  it('turns stdin bytes and stdout resize into events, and stops on close', async () => {
    const term = createFakeTerminal()
    const source = createInputSource(term)
    const iter = source[Symbol.asyncIterator]()
    term.feed('\x1b[B')
    term.resize(100, 30)
    expect((await iter.next()).value).toEqual(key('down'))
    expect((await iter.next()).value).toEqual({ type: 'resize', columns: 100, rows: 30 })
    source.close()
    expect((await iter.next()).done).toBe(true)
    term.feed('x') // no listener left; must not throw
  })
  it('createQueue buffers before and resolves after pulls', async () => {
    const q = createQueue<InputEvent>()
    const it = q.iterable[Symbol.asyncIterator]()
    const pending = it.next()
    q.push(key('a'))
    expect((await pending).value).toEqual(key('a'))
    q.close()
    q.push(key('b'))
    expect((await it.next()).done).toBe(true)
  })
})
