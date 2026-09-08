import { describe, it, expect } from 'vitest'
import { stripAnsi, hasAnsi, frameToString } from './ansi'
import { paint } from './stub'
import { frameFixtures } from './conformance'

describe('stripAnsi', () => {
  it('removes SGR, cursor, erase, private-mode and OSC sequences', () => {
    const s = '\x1b[1mbold\x1b[22m \x1b[31;1mred\x1b[0m \x1b[2J\x1b[H\x1b[?25l\x1b]0;title\x07x\x1b]8;;http://a\x1b\\link'
    expect(stripAnsi(s)).toBe('bold red xlink')
  })
  it('leaves plain text, newlines and unicode untouched', () => {
    for (const f of frameFixtures) expect(stripAnsi(f)).toBe(f)
  })
  it('hasAnsi is stateful-safe', () => {
    expect(hasAnsi('\x1b[1mx')).toBe(true)
    expect(hasAnsi('\x1b[1mx')).toBe(true)
    expect(hasAnsi('plain')).toBe(false)
  })
})

describe('paint identity', () => {
  it('strip(paint(bytes)) === bytes for every fixture', () => {
    for (const f of frameFixtures) expect(stripAnsi(paint(f))).toBe(f)
  })
  it('paint actually adds ANSI', () => {
    expect(hasAnsi(paint('x'))).toBe(true)
  })
  it('frameToString decodes bytes', () => {
    expect(frameToString(new TextEncoder().encode('héllo'))).toBe('héllo')
    expect(frameToString('s')).toBe('s')
  })
})
