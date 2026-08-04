# @mdxld/frame

**The unstyled, types-only contract for Field, Frame, View and Rendering.**

```
View  ──materialised at one moment──▶  Frame  ──serialized──▶  Rendering
  the standing definition               a bundle of Fields      markdown │ data │ React │ …
```

Any stateful app an agent has to read wants this. It is the answer to a specific failure: an app
grows a human face and an agent face, the two drift, and nobody notices until an agent acts on a
number the screen never showed. The fix is not a second renderer — it is one typed model whose
faces are provably serializations of it, and a value type that cannot be printed without saying
where it came from.

Zero appearance. No CSS, no class names, no colours, no spacing, no JSX. No React, no DOM, no
HTML. **No dependencies at all** — a test asserts it.

## Install

```bash
pnpm add @mdxld/frame
```

## The contract, in prose

### A Field is the atom

Every rendered value is a **Field**: its value plus the provenance it was derived under — an
**Attribution**, a **SourceWatermark**, an **asOf**, and, for a model value, a **confidence**.
There are no naked numbers. A face is never handed a number without its receipt.

**Attribution** is `OBS | CALC | MODEL`: observed, deterministically computed, or model output.
Nothing above `CALC` goes unattributed.

**Presence** has four states, and the difference between them is the whole point:

| state         | means                                                           | glyph                        |
| ------------- | --------------------------------------------------------------- | ---------------------------- |
| `present`     | the Frame holds this value and the server has confirmed it       | the value                    |
| `absent`      | genuinely unknown                                                | `—`, optionally `— (reason)` |
| `withheld`    | the value exists and this vantage may not see it                 | `withheld(<licence class>)`  |
| `unconfirmed` | a local, optimistic value the server has not acknowledged        | `<value> ~`                  |

`absent` and `withheld` are different facts, and collapsing them is a quiet lie about the record:
"we have no reading" and "there is a reading you are not licensed for" are answers a counterparty
acts on differently. `unconfirmed` exists because offline / store-and-forward is deferred but not
foreclosed — a client may hold values the server has not confirmed, and the contract can say so
rather than promote them silently.

**Honesty is enforced at construction, and again at assembly.** A `MODEL` value must carry its
source, its model version and a confidence in `[0,1]`; an `OBS`/`CALC` value must carry neither a
model version nor a confidence; a `withheld` value must name its licence class; a value with no
value at all must not carry a confidence. `makeField` throws on any of these, and `makeFrame`
re-runs the check on every leaf — because the Fields that actually arrive dishonest are the ones
that came over the wire as JSON and never met a constructor.

**asOf is carried from day one, and this package decides nothing about it.** There is no
`maxAge`, no `isStale`, no freshness glyph anywhere in the contract, and a test asserts the public
surface exposes nothing matching `/stale|fresh|expire|age/`. What to do about an old value is
policy, and policy is not this package's to invent.

### A Frame is a View materialised at one moment

A Frame is a typed bundle of Fields, organised into **Roles** and stamped with the **snapshot
token** that names the instant. **The Frame invents nothing.** Every Field has a canonical path —
`shipment.status` for a scalar, `lines[0].gtin` for a row cell — and those paths are the addresses
that face parity compares.

A Role holds scalars or rows, never both. That is not a limitation so much as a decision: a block
that is both a header and a register is two blocks, and naming them separately is what makes each
addressable.

### A View is the standing definition

Which Roles, in what order, at what **token budget**, addressed by a stable id. A View selects; it
never computes. Two rules, both fail-closed and both tested:

- **Unknown ids fail closed.** An unknown View or Role id throws an `UnknownIdError` carrying
  every known id. No fuzzy matching, no best-effort partial render. A View that selects an
  unregistered Role is refused at registration, so it never becomes addressable at all.
- **An over-budget View throws.** `BudgetExceededError`, carrying the budget, the spend and the
  tokenizer id. There is no truncation tier, no elision tier and no summarisation tier — a test
  asserts the public surface exposes no such affordance. An over-budget View is a defect the
  author must fix.

Each Role declares its **markdown face** as data — a shape (`list` or `table`), a heading depth, a
declared key order, labels, and where the provenance mark goes. It is declarative on purpose: a
face that cannot author a string cannot invent a value. A Role with no declared markdown face
cannot be registered.

### A Rendering is one serialization of a Frame

A Rendering **never invents or changes a value** — it chooses only glyphs, layout and token spend,
and it names the format and the tokenizer its accounting was done under.

There is exactly **one traversal** of a Frame, and every face is a sink adapter over it. The walk
computes each Field's canonical glyph and hands the finished string to the sink; the sink places
it. A sink is structurally never given the chance to author a value. Two sinks ship —
`markdownSink()` and `dataSink()` — and a React face is a third, written in the consumer, because
this package does not import React.

**The markdown face is derived from Fields.** There is no HTML renderer here and no
HTML-to-markdown converter, and there never will be: laundering markup into markdown is how a face
stops being a serialization of the model and becomes a transcription of a screen.

## Face parity — the assertion that makes it real

> Every Field in the Frame appears in both Renderings, and neither Rendering invents one.

```ts
import { assertFaceParity, renderMarkdown, renderData } from '@mdxld/frame'

assertFaceParity(frame, [renderMarkdown(frame, { registry }), renderData(frame, { registry }), reactFace])
```

That one call is what lets a designer restructure any markup without breaking the agent face, and
it costs a great deal less than a pixel-perfect snapshot because it tests the claim that matters
(the faces say the same thing) rather than the one that does not (the markup did not move). It
catches a dropped Field, an invented path, a Field emitted twice, a `withheld` value laundered
into a bare absence, an absent value filled in with a zero, and — by default — a face that rounded
or re-formatted a number.

**What it cannot do, said plainly.** Parity compares *declared emissions*. A face written as a
`RenderSink` has its declaration generated by the one walk, so its declaration cannot drift from
its bytes. A face that declares its emissions by hand (`declareRendering`) is being taken at its
word about what it emitted; parity holds that word against the Frame, but it cannot see bytes the
face never declared. That is a real limit, and it is the reason to write faces as sinks.

## Example

```ts
import { createRegistry, makeFrame, present, absent, withheld, renderMarkdown, renderData, assertFaceParity } from '@mdxld/frame'

const asOf = { instant: '2026-08-04T12:00:00Z' }
const observed = { attribution: 'OBS' as const, watermark: { source: 'epcis-spine' }, asOf }

const registry = createRegistry()
  .withRoles({ id: 'shipment', title: 'Shipment', markdown: { kind: 'list', labels: { status: 'Status' } } })
  .withViews({ id: 'shipment-detail', roles: ['shipment'], budget: 200 })

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

console.log(renderMarkdown(frame, { registry }).body)
```

```markdown
_snapshot evt:0f3a91 · as of 2026-08-04T12:00:00Z_

## Shipment

- **Status**: shipped [OBS epcis-spine]
- **temperature**: — (no sensor on this lane) [OBS epcis-spine]
- **unitPrice**: withheld(commercial-terms) [OBS epcis-spine]
```

A ready-made Frame exercising all four presence states and all three attributions ships as
`@mdxld/frame/fixtures` — point your own face's parity test at it.

## Where this came from

The vocabulary — View, Frame, Field, Attribution, SourceWatermark, Rendering, Pane — is **shipped
and measured** in the `kestrel` trading terminal, and this package is a port of a proven design,
not an invention. `makeField`, `isHonestConfidence` and the construct-time refusal are kestrel's;
the one-walk / sink-adapter seam is kestrel's `walkKernel`; "an over-budget View is a defect the
author must fix" is kestrel's rule verbatim.

Three things are new here, and all three come from a shared-record domain that a single-desk
trading model does not have:

1. **`withheld`** — kestrel has no licence classes, because a trading desk sees its own book. A
   world with many vantages over one record does, and `present`/`absent`/`withheld` are three
   different things.
2. **`unconfirmed`** — a design allowance for store-and-forward clients, kept as a presence state
   rather than a flag so no face can accidentally print an unacknowledged value as a confirmed one.
3. **A wall-clock `asOf`** — kestrel is deliberately date-blind for replay determinism, so its
   stamp is an ordinal. Both are honest and both are supported (`{ seq }` or `{ instant }`).

## API

`makeField` · `present` · `unconfirmed` · `absent` · `withheld` · `assertFieldHonest` · `isField` ·
`isHonestConfidence` · `hasValue` — the Field.

`makeFrame` · `walkFrame` · `framePaths` · `scalarPath` · `cellPath` — the Frame.

`createRegistry` · `ViewRegistry` — the View.

`renderFrame` · `renderMarkdown` · `renderData` · `markdownSink` · `dataSink` ·
`declareRendering` · `approxCharsPerToken` — the Rendering.

`faceParity` · `assertFaceParity` — the assertion.

`renderGlyph` · `valueText` · `provenanceMark` · `canonicalText` · `ABSENT_GLYPH` ·
`UNCONFIRMED_MARK` — the one value serializer every face is held to.

`FieldHonestyError` · `FrameError` · `UnknownIdError` · `BudgetExceededError` · `FaceParityError`
— every one of them thrown, never logged.

## Licence

MIT
