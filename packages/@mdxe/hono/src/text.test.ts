/**
 * `./text.ts` — the text registers on the HTTP face (mdx-8je.18).
 *
 * Pins: the Accept rung delegates to the ONE ladder (`@mdxui/text/capabilities`) and returns only
 * an Accept-decided register; the bytes are `@mdxui/text`'s bytes; the token header is LABELLED;
 * the 406 names what exists.
 */
import { describe, it, expect } from 'vitest'
import { parse } from 'mdxld'
import { resolveCapabilities } from '@mdxui/text/capabilities'
import { render } from '@mdxui/text/core'
import { countTokens } from '@mdxe/cli-core/tokens'
import {
  resolveTextRegister,
  capabilitiesForRegister,
  renderTextRegister,
  textRegisterHeaders,
  textRegisterResponse,
  notAcceptable,
  notAcceptableProblem,
  formatTokensMethod,
  TEXT_REGISTER_CONTENT_TYPES,
  TOKENS_HEADER,
  TOKENS_METHOD_HEADER,
  DEFAULT_TOKENIZER,
} from './text.js'

const doc = parse(`---
$type: BlogPost
title: Hello
description: A test
---

# Hello

This is **bold** and *italic*.

- one
- two
`)

describe('resolveTextRegister — the Accept rung', () => {
  it('text/markdown → md, decided by accept, an agent caller, never interactive', () => {
    const r = resolveTextRegister('text/markdown')
    expect(r?.register).toBe('md')
    expect(r?.capabilities.caller).toEqual({ kind: 'agent', harness: null, detectedBy: 'accept', interactive: false })
    expect(r?.capabilities.interactive).toBe(false)
    expect(r?.capabilities.width).toBe(Infinity)
  })

  it('text/plain → plain, decided by accept, a human caller, never interactive', () => {
    const r = resolveTextRegister('text/plain')
    expect(r?.register).toBe('plain')
    expect(r?.capabilities.caller).toEqual({ kind: 'human', harness: null, detectedBy: 'accept', interactive: false })
  })

  it('highest q wins between the two text types', () => {
    expect(resolveTextRegister('text/markdown;q=0.5, text/plain')?.register).toBe('plain')
    expect(resolveTextRegister('text/plain;q=0.1, text/markdown;q=0.9')?.register).toBe('md')
  })

  it('names no register for wildcards, text/html, application/json, absent, blank, or q=0', () => {
    for (const accept of ['*/*', 'text/*', 'text/html', 'application/json', undefined, '', '   ', 'text/markdown;q=0']) {
      expect(resolveTextRegister(accept)).toBeNull()
    }
  })

  it('never leaks an env/TTY rung onto the HTTP face (only an accept-decided result is returned)', () => {
    // resolveCapabilities with no Accept resolves by the TTY probe; the HTTP rung must not surface that.
    expect(resolveCapabilities({}).caller.detectedBy).toBe('tty')
    expect(resolveTextRegister(undefined)).toBeNull()
  })

  it('an extension-decided register resolves through the flag rung', () => {
    const caps = capabilitiesForRegister('md')
    expect(caps.register).toBe('md')
    expect(caps.caller.detectedBy).toBe('flag')
    expect(caps.interactive).toBe(false)
  })
})

describe('renderTextRegister — the bytes are @mdxui/text bytes', () => {
  it('md register is byte-identical to @mdxui/text render(doc, capabilities)', () => {
    const { capabilities } = resolveTextRegister('text/markdown')!
    expect(renderTextRegister(doc, capabilities)).toBe(render(doc, capabilities))
    expect(renderTextRegister(doc, 'md')).toBe(render(doc, 'md'))
  })

  it('plain register is byte-identical to @mdxui/text render(doc, "plain")', () => {
    const { capabilities } = resolveTextRegister('text/plain')!
    expect(renderTextRegister(doc, capabilities)).toBe(render(doc, 'plain'))
  })

  it('the two registers differ (plain carries no markdown marks in its structure)', () => {
    expect(renderTextRegister(doc, 'md')).not.toBe(renderTextRegister(doc, 'plain'))
  })
})

describe('textRegisterHeaders — Content-Type, Vary, labelled tokens', () => {
  it('md: text/markdown; charset=utf-8, Vary: Accept, x-markdown-tokens with a labelled method', async () => {
    const body = renderTextRegister(doc, 'md')
    const headers = await textRegisterHeaders('md', body)
    expect(headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(headers.get('Vary')).toBe('Accept')

    const expected = await countTokens(body, DEFAULT_TOKENIZER)
    expect(headers.get(TOKENS_HEADER)).toBe(String(expected.count))
    expect(Number(headers.get(TOKENS_HEADER))).toBeGreaterThan(0)
    // The method label is one of the oracle's honest labels, never a bare number with no provenance.
    expect(headers.get(TOKENS_METHOD_HEADER)).toBe(formatTokensMethod(expected))
    expect(headers.get(TOKENS_METHOD_HEADER)).toMatch(/^(tiktoken-cl100k|tiktoken-o200k|anthropic-count-tokens|chars-approx); tokenizer=(cl100k_base|o200k_base|fable-native)$/)
  })

  it('plain: text/plain; charset=utf-8, Vary: Accept, no markdown token header', async () => {
    const headers = await textRegisterHeaders('plain', renderTextRegister(doc, 'plain'))
    expect(headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(headers.get('Vary')).toBe('Accept')
    expect(headers.get(TOKENS_HEADER)).toBeNull()
    expect(headers.get(TOKENS_METHOD_HEADER)).toBeNull()
  })

  it('vary:false omits Vary (an extension-decided response does not vary by Accept)', async () => {
    const headers = await textRegisterHeaders('md', 'x', { vary: false })
    expect(headers.get('Vary')).toBeNull()
  })

  it('the content-type table is the convention', () => {
    expect(TEXT_REGISTER_CONTENT_TYPES).toEqual({ md: 'text/markdown; charset=utf-8', plain: 'text/plain; charset=utf-8' })
  })
})

describe('textRegisterResponse', () => {
  it('renders + stamps in one call', async () => {
    const res = await textRegisterResponse(doc, resolveTextRegister('text/markdown')!.capabilities)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(await res.text()).toBe(render(doc, 'md'))
  })

  it('refuses a non-text register rather than guessing', async () => {
    await expect(textRegisterResponse(doc, 'html' as never)).rejects.toThrow(/not a text register/)
  })
})

describe('notAcceptable — fail closed, name what exists', () => {
  const available = ['text/html', 'application/json', 'text/markdown', 'text/plain']

  it('is a 406 problem+json naming every available media type', async () => {
    const res = notAcceptable('text/csv', available)
    expect(res.status).toBe(406)
    expect(res.headers.get('Content-Type')).toBe('application/problem+json; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')
    const body = (await res.json()) as ReturnType<typeof notAcceptableProblem>
    expect(body.status).toBe(406)
    expect(body.title).toBe('Not Acceptable')
    expect(body.code).toBe('FORMAT')
    expect(body.accept).toBe('text/csv')
    expect(body.available).toEqual(available)
    for (const type of available) expect(body.detail).toContain(type)
    expect(body.detail).toContain('text/csv')
  })

  it('the problem is pure data', () => {
    expect(notAcceptableProblem('x/y', ['a/b'])).toMatchObject({ status: 406, accept: 'x/y', available: ['a/b'] })
  })
})
