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
 * @packageDocumentation
 */

import { absent, present, unconfirmed, withheld, type AsOf } from './field.js'
import { makeFrame, type Frame } from './frame.js'
import { createRegistry, type ViewRegistry } from './view.js'

const asOf: AsOf = { instant: '2026-08-04T12:00:00Z' }
const observed = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }
const computed = { attribution: 'CALC' as const, watermark: { source: 'coverage-rollup' }, asOf }
const modelled = { attribution: 'MODEL' as const, watermark: { source: 'eta-model', modelVersion: '2.1.0' }, asOf, confidence: 0.62 }

/** A registry holding the fixture's two Roles and its View. */
export function fixtureRegistry(budget = 400): ViewRegistry {
  return createRegistry()
    .withRoles(
      {
        id: 'shipment',
        title: 'Shipment',
        describe: 'the shipment header — status, ETA, conditions',
        markdown: {
          kind: 'list',
          heading: 2,
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
    .withViews({ id: 'shipment-detail', roles: ['shipment', 'lines'], budget, describe: 'one shipment, header and lines' })
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
