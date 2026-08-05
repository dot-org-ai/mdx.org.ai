/**
 * The README's headline example, executed. It used to be prose: it declared `budget: 200` on a
 * View and called `renderData` with no data budget at all, and running it verbatim threw. A
 * README example that has never been run is a claim with no receipt, which is the one thing this
 * package is not allowed to ship.
 */
import { describe, it, expect } from 'vitest'
import { createRegistry, makeFrame, present, absent, withheld, renderMarkdown, renderData, assertFaceParity } from './index.js'

const asOf = { instant: '2026-08-04T12:00:00Z' }
const observed = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }

const registry = createRegistry()
  .withRoles({
    id: 'shipment',
    title: 'Shipment',
    markdown: { kind: 'list', keys: ['status', 'temperature', 'unitPrice'], labels: { status: 'Status' } },
  })
  .withViews({ id: 'shipment-detail', roles: ['shipment'], budgets: { markdown: 80, data: 400 } })

const frame = makeFrame({
  view: 'shipment-detail',
  snapshot: { token: 'evt:0f3a91', asOf },
  roles: [
    {
      role: 'shipment',
      fields: {
        status: present('shipped', observed),
        temperature: absent({ ...observed, reason: 'no sensor on this lane' }),
        unitPrice: withheld('commercial-terms', observed),
      },
    },
  ],
})

describe('the README example', () => {
  it('runs, and renders the block the README prints', () => {
    expect(renderMarkdown(frame, { registry }).body).toMatchInlineSnapshot(`
      "_snapshot evt:0f3a91 · as of 2026-08-04T12:00:00Z_

      ## Shipment

      - **Status**: shipped [OBS epcis-spine]
      - **temperature**: — (no sensor on this lane) [OBS epcis-spine]
      - **unitPrice**: withheld(commercial-terms) [OBS epcis-spine]
      "
    `)
  })

  it('passes the parity call the README shows, with both faces budgeted', () => {
    expect(() => assertFaceParity(frame, [renderMarkdown(frame, { registry }), renderData(frame, { registry })])).not.toThrow()
  })

  it('fits the budgets the README declares', () => {
    expect(renderMarkdown(frame, { registry }).tokens!.spent).toBeLessThanOrEqual(80)
    expect(renderData(frame, { registry }).tokens!.spent).toBeLessThanOrEqual(400)
  })
})
