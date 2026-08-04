import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderMarkdown, renderData, renderFrame, markdownSink } from './render.js'
import { makeFrame } from './frame.js'
import { present, absent, withheld, unconfirmed } from './field.js'
import { createRegistry } from './view.js'
import { BudgetExceededError, FrameError, UnknownIdError } from './errors.js'
import { fixtureFrame, fixtureRegistry } from './fixtures.js'
import * as contract from './index.js'

const asOf = { instant: '2026-08-04T12:00:00Z' } as const
const obs = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }

describe('the markdown face', () => {
  it('is derived from Fields — same Frame, same bytes', () => {
    const registry = fixtureRegistry()
    const a = renderMarkdown(fixtureFrame(), { registry })
    const b = renderMarkdown(fixtureFrame(), { registry })
    expect(a.body).toBe(b.body)
    expect(a.body).toMatchInlineSnapshot(`
      "_snapshot evt:0f3a91 · as of 2026-08-04T12:00:00Z_

      ## Shipment

      - **Status**: shipped [OBS epcis-spine]
      - **ETA (days)**: 4.5 [MODEL eta-model@2.1.0 conf=0.62]
      - **Temperature**: — (no sensor on this lane) [OBS epcis-spine]
      - **Unit price**: withheld(commercial-terms) [OBS epcis-spine]
      - **Received qty**: 12 ~ [OBS epcis-spine]

      ## Lines

      | GTIN | Qty | Coverage |
      | --- | --- | --- |
      | 00614141007349 | 12 | 0.83 |
      | 00614141999996 | 4 | — |

      _provenance — GTIN: [OBS epcis-spine]; Qty: [OBS epcis-spine]; Coverage: [CALC coverage-rollup]_
      "
    `)
  })

  it('renders the provenance class on every value, and a MODEL value never with an observation’s weight', () => {
    const body = renderMarkdown(fixtureFrame(), { registry: fixtureRegistry() }).body
    expect(body).toContain('[MODEL eta-model@2.1.0 conf=0.62]')
    expect(body).toContain('[OBS epcis-spine]')
    expect(body).toContain('[CALC coverage-rollup]')
  })

  it('keeps a legend column marked — the mark moves, it never disappears', () => {
    const body = renderMarkdown(fixtureFrame(), { registry: fixtureRegistry() }).body
    // every column of this fixture is uniform in provenance, so all three factor to the legend
    expect(body).toContain('_provenance — GTIN: [OBS epcis-spine]; Qty: [OBS epcis-spine]; Coverage: [CALC coverage-rollup]_')
    // the canonical glyph each face is held to still carries the mark, legend or not
    const rendering = renderMarkdown(fixtureFrame(), { registry: fixtureRegistry() })
    expect(rendering.emitted.find((e) => e.path === 'lines[0].coverage')?.text).toBe('0.83 [CALC coverage-rollup]')
  })

  it('leaves a mixed-provenance column marked inline, per cell', () => {
    const registry = createRegistry()
      .withRoles({ id: 'mixed', title: 'Mixed', markdown: { kind: 'table', keys: ['v'], provenance: 'legend' } })
      .withViews({ id: 'm', roles: ['mixed'], budget: 500 })
    const frame = makeFrame({
      view: 'm',
      snapshot: { token: 't', asOf },
      roles: [
        {
          role: 'mixed',
          rows: [{ v: present(1, obs) }, { v: present(2, { attribution: 'MODEL', watermark: { source: 'guess', modelVersion: '1' }, asOf, confidence: 0.5 }) }],
        },
      ],
    })
    const body = renderMarkdown(frame, { registry }).body
    expect(body).toContain('| 1 [OBS epcis-spine] |')
    expect(body).toContain('| 2 [MODEL guess@1 conf=0.5] |')
    expect(body).not.toContain('_provenance —')
  })

  it('renders an empty table as a declared empty state, never as a missing Role', () => {
    const registry = createRegistry()
      .withRoles({ id: 'empty', title: 'Empty', markdown: { kind: 'table', keys: ['v'] } })
      .withViews({ id: 'e', roles: ['empty'], budget: 500 })
    const frame = makeFrame({ view: 'e', snapshot: { token: 't', asOf }, roles: [{ role: 'empty', rows: [] }] })
    expect(renderMarkdown(frame, { registry }).body).toContain('_(no rows)_')
  })
})

describe('absent, withheld and unconfirmed are distinguishable in EVERY face', () => {
  const registry = fixtureRegistry()
  const frame = fixtureFrame()

  it('markdown gives each its own glyph', () => {
    const body = renderMarkdown(frame, { registry }).body
    expect(body).toContain('**Temperature**: — (no sensor on this lane)')
    expect(body).toContain('**Unit price**: withheld(commercial-terms)')
    expect(body).toContain('**Received qty**: 12 ~')
    expect(body).not.toContain('**Unit price**: —')
  })

  it('the data face carries the presence, the licence class and the reason verbatim', () => {
    const payload = JSON.parse(renderData(frame, { registry, budget: 5000 }).body) as {
      roles: { role: string; values: { path: string; presence: string; licenceClass?: string; reason?: string; value?: unknown }[] }[]
    }
    const values = payload.roles.flatMap((r) => r.values)
    const byPath = new Map(values.map((v) => [v.path, v]))
    expect(byPath.get('shipment.temperature')).toMatchObject({ presence: 'absent', reason: 'no sensor on this lane' })
    expect(byPath.get('shipment.unitPrice')).toMatchObject({ presence: 'withheld', licenceClass: 'commercial-terms' })
    expect(byPath.get('shipment.receivedQty')).toMatchObject({ presence: 'unconfirmed', value: 12 })
    expect(byPath.get('shipment.temperature')).not.toHaveProperty('value')
    expect(byPath.get('shipment.unitPrice')).not.toHaveProperty('value')
  })

  it('never renders an absent value as a zero and never as the withheld glyph', () => {
    const body = renderMarkdown(frame, { registry }).body
    expect(body).not.toMatch(/\*\*Temperature\*\*: 0/)
    expect(body).not.toMatch(/\*\*Temperature\*\*: withheld/)
  })
})

describe('an over-budget View THROWS — there is no truncation tier', () => {
  it('throws BudgetExceededError carrying the budget, the spend and the tokenizer', () => {
    const registry = fixtureRegistry(20)
    try {
      renderMarkdown(fixtureFrame(), { registry })
      throw new Error('expected an over-budget throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BudgetExceededError)
      const e = error as BudgetExceededError
      expect(e.budget).toBe(20)
      expect(e.spent).toBeGreaterThan(20)
      expect(e.tokenizer).toBe('approx-chars/4@1')
      expect(e.message).toMatch(/never truncates, elides or summarises/)
    }
  })

  it('exposes no truncation, elision or summarisation affordance anywhere in the contract', () => {
    const surface = Object.keys(contract)
    expect(surface.filter((k) => /truncat|elid|elision|summari|degrad/i.test(k))).toEqual([])
  })

  it('reports honest accounting when it fits', () => {
    const rendering = renderMarkdown(fixtureFrame(), { registry: fixtureRegistry(400) })
    expect(rendering.tokens.budget).toBe(400)
    expect(rendering.tokens.spent).toBeLessThanOrEqual(400)
    expect(rendering.tokens.tokenizer).toBe('approx-chars/4@1')
  })
})

describe('renderFrame fails closed', () => {
  it('refuses a Frame whose View id is not registered', () => {
    const frame = makeFrame({ view: 'ghost-view', snapshot: { token: 't', asOf }, roles: [] })
    expect(() => renderMarkdown(frame, { registry: fixtureRegistry() })).toThrow(UnknownIdError)
  })

  it('refuses a Frame carrying a Role the View does not select', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list' } }, { id: 'b', title: 'B', markdown: { kind: 'list' } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({
      view: 'v',
      snapshot: { token: 't', asOf },
      roles: [
        { role: 'a', fields: { x: present(1, obs) } },
        { role: 'b', fields: { y: present(2, obs) } },
      ],
    })
    expect(() => renderMarkdown(frame, { registry })).toThrow(/does not select/)
  })

  it('refuses a Frame missing a Role the View selects', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list' } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({ view: 'v', snapshot: { token: 't', asOf }, roles: [] })
    expect(() => renderMarkdown(frame, { registry })).toThrow(/carries no such Role/)
  })

  it('refuses a Field the declared key set does not include — no silent drop', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list', keys: ['x'] } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({ view: 'v', snapshot: { token: 't', asOf }, roles: [{ role: 'a', fields: { x: present(1, obs), secret: withheld('c', obs) } }] })
    expect(() => renderMarkdown(frame, { registry })).toThrow(/declared key set does not include/)
  })

  it('refuses a declared key with no Field — a declared key is not an absence', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list', keys: ['x', 'y'] } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({ view: 'v', snapshot: { token: 't', asOf }, roles: [{ role: 'a', fields: { x: present(1, obs) } }] })
    expect(() => renderMarkdown(frame, { registry })).toThrow(/a declared key with no Field is a defect, not an absence/)
  })

  it('refuses a Role that mixes scalars and rows', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list' } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({
      view: 'v',
      snapshot: { token: 't', asOf },
      roles: [{ role: 'a', fields: { x: present(1, obs) }, rows: [{ y: present(2, obs) }] }],
    })
    expect(() => renderMarkdown(frame, { registry })).toThrow(FrameError)
  })

  it('refuses a ragged table — every row carries the same columns', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'table' } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({
      view: 'v',
      snapshot: { token: 't', asOf },
      roles: [{ role: 'a', rows: [{ x: present(1, obs) }, { x: present(2, obs), y: present(3, obs) }] }],
    })
    expect(() => renderMarkdown(frame, { registry })).toThrow(/row 1/)
  })
})

describe('a sink cannot invent a value', () => {
  it('is handed the finished glyph — the RenderSink interface has no access to author one', () => {
    const seen: string[] = []
    const sink = markdownSink()
    const spy = {
      ...sink,
      field(pathed: Parameters<typeof sink.field>[0], spec: Parameters<typeof sink.field>[1], glyph: string) {
        seen.push(glyph)
        sink.field(pathed, spec, glyph)
      },
    }
    renderFrame(fixtureFrame(), { registry: fixtureRegistry(), sink: spy })
    expect(seen).toContain('withheld(commercial-terms) [OBS epcis-spine]')
    expect(seen).toContain('— (no sensor on this lane) [OBS epcis-spine]')
    expect(seen).toHaveLength(11)
  })
})

describe('the package decides nothing about staleness, and launders nothing from HTML', () => {
  it('carries asOf on every rendered Field and exposes no staleness affordance', () => {
    const payload = JSON.parse(renderData(fixtureFrame(), { registry: fixtureRegistry(), budget: 5000 }).body) as { roles: { values: { asOf: unknown }[] }[] }
    for (const value of payload.roles.flatMap((r) => r.values)) expect(value.asOf).toBeDefined()
    expect(Object.keys(contract).filter((k) => /stale|fresh|expire|age/i.test(k))).toEqual([])
  })

  it('depends on nothing — no react, no DOM, no HTML-to-markdown converter', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
    expect(pkg.dependencies ?? {}).toEqual({})
    expect(pkg.peerDependencies ?? {}).toEqual({})
  })
})

describe('unconfirmed values survive the round trip', () => {
  it('renders a locally-held value as unconfirmed rather than promoting it', () => {
    const registry = createRegistry()
      .withRoles({ id: 'a', title: 'A', markdown: { kind: 'list' } })
      .withViews({ id: 'v', roles: ['a'], budget: 500 })
    const frame = makeFrame({ view: 'v', snapshot: { token: 't', asOf }, roles: [{ role: 'a', fields: { qty: unconfirmed(7, obs), other: absent(obs) } }] })
    const body = renderMarkdown(frame, { registry }).body
    expect(body).toContain('- **qty**: 7 ~ [OBS epcis-spine]')
    expect(body).toContain('- **other**: — [OBS epcis-spine]')
  })
})
