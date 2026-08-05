/**
 * # A fixture Frame that exercises the whole contract
 *
 * One View, two Roles (a list and a table), all four presence states and all three attributions.
 * It is exported as `@mdxld/frame/fixtures` because a consumer writing its own face wants
 * exactly this Frame to point {@link assertFaceParity} at — a face that survives this fixture has
 * handled absent, withheld and unconfirmed, which is where faces actually break.
 *
 * It is a fixture, not a demo: it describes a shipment because the contract was ported for a
 * supply-chain spine, and nothing in the package knows or cares what a shipment is.
 *
 * The default budgets are the MEASURED spends of the two shipped faces on this Frame, rounded up
 * — markdown 136 and data 644 under `approx-chars/4@1`. They are two different numbers because
 * the faces are two different sizes; see the note in `view.ts`.
 *
 * @packageDocumentation
 */

import { absent, modelConfidence, present, unconfirmed, withheld, type AsOf } from './field.js'
import { makeFrame, type Frame } from './frame.js'
import { createRegistry, type ViewRegistry } from './view.js'

const asOf: AsOf = { instant: '2026-08-04T12:00:00Z' }
const observed = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }
const computed = { attribution: 'CALC' as const, watermark: { source: 'coverage-rollup' }, asOf }
const modelled = { attribution: 'MODEL' as const, watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf, confidence: modelConfidence(0.62) }

/** The measured spend of each shipped face on {@link fixtureFrame}, with a little headroom. */
export const FIXTURE_BUDGETS: Readonly<Record<string, number>> = { markdown: 200, data: 800 }

/**
 * A registry holding the fixture's two Roles and its View. Pass a partial budget map to override
 * one face's budget — `fixtureRegistry({ markdown: 20 })` is how a test exercises the over-budget
 * refusal without touching the data face's budget.
 */
export function fixtureRegistry(budgets: Readonly<Record<string, number>> = {}): ViewRegistry {
  return createRegistry()
    .withRoles(
      {
        id: 'shipment',
        title: 'Shipment',
        describe: 'the shipment header — status, ETA, conditions',
        markdown: {
          kind: 'list',
          heading: 2,
          keys: ['status', 'eta', 'temperature', 'unitPrice', 'receivedQty'],
          labels: { status: 'Status', eta: 'ETA (days)', temperature: 'Temperature', unitPrice: 'Unit price', receivedQty: 'Received qty' },
        },
      },
      {
        id: 'lines',
        title: 'Lines',
        describe: 'the line items on the shipment',
        markdown: {
          kind: 'table',
          heading: 2,
          keys: ['gtin', 'qty', 'coverage'],
          labels: { gtin: 'GTIN', qty: 'Qty', coverage: 'Coverage' },
          provenance: 'legend',
        },
      }
    )
    .withViews({
      id: 'shipment-detail',
      roles: ['shipment', 'lines'],
      budgets: { ...FIXTURE_BUDGETS, ...budgets },
      describe: 'one shipment, header and lines',
    })
}

/** The fixture Frame: all four presence states, all three attributions. */
export function fixtureFrame(): Frame {
  return makeFrame({
    view: 'shipment-detail',
    snapshot: { token: 'evt:0f3a91', asOf },
    roles: [
      {
        role: 'shipment',
        fields: {
          status: present('shipped', observed),
          eta: present(4.5, modelled),
          temperature: absent({ ...observed, reason: 'no sensor on this lane' }),
          unitPrice: withheld('commercial-terms', observed),
          receivedQty: unconfirmed(12, observed),
        },
      },
      {
        role: 'lines',
        rows: [
          { gtin: present('00614141007349', observed), qty: present(12, observed), coverage: present(0.83, computed) },
          { gtin: present('00614141999996', observed), qty: present(4, observed), coverage: absent(computed) },
        ],
      },
    ],
  })
}
