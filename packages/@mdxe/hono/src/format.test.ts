/**
 * `./format.ts` — content negotiation on the HTTP face (mdx-8je.18).
 *
 * GET with `Accept: text/markdown` returns the md register bytes byte-identical to `@mdxui/text`'s
 * output plus the Markdown-for-Agents headers; `text/plain` the plain register; an `Accept` naming
 * only unimplemented formats is a 406 naming what exists (never a silent downgrade); the token
 * header carries a labelled count method.
 */
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { parse, stringify } from 'mdxld'
import { render } from '@mdxui/text/core'
import { countTokens } from '@mdxe/cli-core/tokens'
import {
  negotiateFormat,
  getFormatFromAccept,
  parseFormat,
  formatMiddleware,
  formatResponse,
  getFormat,
  documentResponse,
  contextFromAccept,
  contextFromExtension,
  renderDocument,
  registerForFormat,
  AVAILABLE_MEDIA_TYPES,
  FORMAT_CONTENT_TYPES,
  type FormatContext,
} from './format.js'
import { TOKENS_HEADER, TOKENS_METHOD_HEADER, DEFAULT_TOKENIZER, formatTokensMethod } from './text.js'

const source = `---
$type: BlogPost
title: Hello
description: A test
---

# Hello

This is **bold** and *italic*.

- one
- two
`
const doc = parse(source)

function app(): Hono {
  const a = new Hono()
  a.use('*', formatMiddleware())
  a.get('/doc', (c) => formatResponse(c, doc))
  a.get('/ctx', (c) => c.json(getFormat(c)))
  // The middleware records an extension but does not rewrite the path: the route matches literally.
  a.get('/ctx.md', (c) => c.json(getFormat(c)))
  return a
}

const get = (path: string, accept?: string) => app().request(path, { headers: accept === undefined ? {} : { Accept: accept } })

describe('negotiateFormat — q-ordered, fail closed', () => {
  it('no Accept / blank / wildcard-only → the default face (html), decided by default or accept', () => {
    expect(negotiateFormat(undefined)).toEqual({ format: 'html', decidedBy: 'default' })
    expect(negotiateFormat('')).toEqual({ format: 'html', decidedBy: 'default' })
    expect(negotiateFormat('*/*')).toEqual({ format: 'html', decidedBy: 'accept' })
  })

  it('maps each served media type', () => {
    expect(negotiateFormat('text/markdown').format).toBe('md')
    expect(negotiateFormat('text/plain').format).toBe('txt')
    expect(negotiateFormat('text/html').format).toBe('html')
    expect(negotiateFormat('application/json').format).toBe('json')
    expect(negotiateFormat('application/xml').format).toBe('xml')
    expect(negotiateFormat('text/mdx').format).toBe('mdx')
  })

  it('highest q wins across faces (a browser Accept is html, not xml)', () => {
    expect(negotiateFormat('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8').format).toBe('html')
    expect(negotiateFormat('application/json, text/markdown;q=0.5').format).toBe('json')
    expect(negotiateFormat('text/markdown;q=0.5, application/json').format).toBe('json')
    expect(negotiateFormat('text/html;q=0.2, text/markdown').format).toBe('md')
  })

  it('an Accept naming only unimplemented formats is REFUSED, never downgraded', () => {
    expect(negotiateFormat('text/csv')).toEqual({ format: null, decidedBy: 'refused' })
    expect(negotiateFormat('application/x-yaml, image/png')).toEqual({ format: null, decidedBy: 'refused' })
    // q=0 is a refusal of that type, not a request for it
    expect(negotiateFormat('text/markdown;q=0')).toEqual({ format: null, decidedBy: 'refused' })
  })

  it('getFormatFromAccept is the same rung, null for refused/default', () => {
    expect(getFormatFromAccept('text/markdown')).toBe('md')
    expect(getFormatFromAccept('text/csv')).toBeNull()
    expect(getFormatFromAccept('')).toBeNull()
  })

  it('registerForFormat maps md/txt only', () => {
    expect(registerForFormat('md')).toBe('md')
    expect(registerForFormat('txt')).toBe('plain')
    expect(registerForFormat('html')).toBeNull()
    expect(registerForFormat(null)).toBeNull()
  })
})

describe('parseFormat — extensions', () => {
  it('.md is the md register and .mdx the raw source: two different formats', () => {
    expect(parseFormat('/a.md')).toEqual({ format: 'md', basePath: '/a' })
    expect(parseFormat('/a.mdx')).toEqual({ format: 'mdx', basePath: '/a' })
    expect(parseFormat('/a.txt')).toEqual({ format: 'txt', basePath: '/a' })
    expect(parseFormat('/a')).toEqual({ format: null, basePath: '/a' })
  })
})

describe('renderDocument — the text registers render through @mdxui/text', () => {
  it('md is the md register, not the raw source', () => {
    const { content, contentType } = renderDocument(doc, 'md')
    expect(content).toBe(render(doc, 'md'))
    expect(content).not.toBe(stringify(doc))
    expect(contentType).toBe('text/markdown; charset=utf-8')
  })

  it('txt is the plain register, not doc.content verbatim', () => {
    const { content, contentType } = renderDocument(doc, 'txt')
    expect(content).toBe(render(doc, 'plain'))
    expect(content).not.toBe(doc.content)
    expect(contentType).toBe('text/plain; charset=utf-8')
  })

  it('mdx is the raw MDXLD source', () => {
    const { content, contentType } = renderDocument(doc, 'mdx')
    expect(content).toBe(stringify(doc))
    expect(contentType).toBe(FORMAT_CONTENT_TYPES.mdx)
  })
})

describe('GET with Accept — the served registers', () => {
  it('Accept: text/markdown → md register bytes, byte-identical to @mdxui/text, with the headers', async () => {
    const res = await get('/doc', 'text/markdown')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')

    const body = await res.text()
    expect(body).toBe(render(doc, 'md'))
    expect(body).not.toBe(source)

    const expected = await countTokens(body, DEFAULT_TOKENIZER)
    expect(res.headers.get(TOKENS_HEADER)).toBe(String(expected.count))
    expect(res.headers.get(TOKENS_METHOD_HEADER)).toBe(formatTokensMethod(expected))
  })

  it('Accept: text/plain → plain register bytes with text/plain and Vary', async () => {
    const res = await get('/doc', 'text/plain')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')
    expect(await res.text()).toBe(render(doc, 'plain'))
    expect(res.headers.get(TOKENS_HEADER)).toBeNull()
  })

  it('Accept for an unimplemented format → 406 naming what exists (no silent downgrade)', async () => {
    const res = await get('/doc', 'text/csv')
    expect(res.status).toBe(406)
    expect(res.headers.get('Content-Type')).toBe('application/problem+json; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')
    const body = (await res.json()) as { status: number; accept: string; available: string[]; detail: string }
    expect(body.status).toBe(406)
    expect(body.accept).toBe('text/csv')
    expect(body.available).toEqual([...AVAILABLE_MEDIA_TYPES])
    expect(body.available).toEqual(expect.arrayContaining(['text/markdown', 'text/plain', 'text/html', 'application/json']))
    expect(body.detail).toContain('text/markdown')
  })

  it('a browser Accept → html with Vary: Accept', async () => {
    const res = await get('/doc', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')
  })

  it('no Accept → html (the default face)', async () => {
    const res = await get('/doc')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('Accept: application/json → json with Vary', async () => {
    const res = await get('/doc', 'application/json')
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('Vary')).toBe('Accept')
    expect(((await res.json()) as { data: { title: string } }).data.title).toBe('Hello')
  })

  it('the format context carries the resolver verdict: Caller for an Accept-decided request', async () => {
    const md = (await (await get('/ctx', 'text/markdown')).json()) as FormatContext
    expect(md.outputFormat).toBe('md')
    expect(md.decidedBy).toBe('accept')
    expect(md.capabilities?.register).toBe('md')
    expect(md.capabilities?.caller).toEqual({ kind: 'agent', harness: null, detectedBy: 'accept', interactive: false })

    const plain = (await (await get('/ctx', 'text/plain')).json()) as FormatContext
    expect(plain.outputFormat).toBe('txt')
    expect(plain.capabilities?.caller).toEqual({ kind: 'human', harness: null, detectedBy: 'accept', interactive: false })

    const html = (await (await get('/ctx', 'text/html')).json()) as FormatContext
    expect(html.capabilities).toBeNull()

    const refused = (await (await get('/ctx', 'text/csv')).json()) as FormatContext
    expect(refused.outputFormat).toBeNull()
    expect(refused.decidedBy).toBe('refused')
  })
})

describe('extension-decided formats', () => {
  it('/doc.md wins over Accept, resolves through the flag rung, carries no Vary but keeps the token header', async () => {
    const ctx = contextFromExtension('md', '/doc', 'text/html')
    expect(ctx.decidedBy).toBe('extension')
    expect(ctx.capabilities?.caller.detectedBy).toBe('flag')
    const res = await documentResponse(doc, ctx)
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(res.headers.get('Vary')).toBeNull()
    expect(res.headers.get(TOKENS_HEADER)).not.toBeNull()
    expect(res.headers.get(TOKENS_METHOD_HEADER)).toMatch(/tokenizer=/)
    expect(await res.text()).toBe(render(doc, 'md'))
  })

  it('/doc.txt is the plain register', async () => {
    const res = await documentResponse(doc, contextFromExtension('txt', '/doc'))
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(await res.text()).toBe(render(doc, 'plain'))
  })

  it('/doc.mdx is the raw source', async () => {
    const res = await documentResponse(doc, contextFromExtension('mdx', '/doc'))
    expect(res.headers.get('Content-Type')).toBe('text/mdx; charset=utf-8')
    expect(await res.text()).toBe(stringify(doc))
  })

  it('the middleware records the extension and strips it from basePath', async () => {
    const ctx = (await (await get('/ctx.md', 'text/csv')).json()) as FormatContext
    expect(ctx.outputFormat).toBe('md')
    expect(ctx.basePath).toBe('/ctx')
    expect(ctx.explicitFormat).toBe(true)
    expect(ctx.decidedBy).toBe('extension')
  })
})

describe('contextFromAccept', () => {
  it('a refused Accept is a context with no format and no capabilities', () => {
    const ctx = contextFromAccept('image/png', '/x')
    expect(ctx).toMatchObject({ outputFormat: null, decidedBy: 'refused', capabilities: null, accept: 'image/png' })
  })
})
