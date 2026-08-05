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

**And they are recoverable from the text.** A present value whose own text is `—`, or
`withheld(commercial-terms)`, or anything ending in ` ~`, is JSON-quoted before it is emitted —
`"—"` — so `present('—')` and `absent()` are not the same bytes and an agent parsing the markdown
face can still tell them apart. A present `null` renders `null`, never `—`: "the record says null"
and "we have no reading" are two different facts, and the four states exist so they never share a
glyph.

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

A Field's `confidence` is a **branded** `ModelConfidence`, constructed only through
`modelConfidence(n)`. A parse-coverage ratio (`matchedSlots / totalSlots`) also lives in `[0,1]`
and is a different quantity; the brand is what stops one being assigned to the other.

A constructed Field and an assembled Frame are **deep-frozen**. A guard you can walk past after it
runs is not a guard.

**asOf is carried from day one, and this package decides nothing about it.** There is no `maxAge`,
no `isStale` and no freshness glyph anywhere in the contract. What to do about an old value is
policy, and policy is not this package's to invent.

### A Frame is a View materialised at one moment

A Frame is a typed bundle of Fields, organised into **Roles** and stamped with the **snapshot
token** that names the instant. **The Frame invents nothing.** Every Field has a canonical path —
`shipment.status` for a scalar, `lines[0].gtin` for a row cell — and those paths are the addresses
that face parity compares.

A Role holds scalars or rows, never both. That is not a limitation so much as a decision: a block
that is both a header and a register is two blocks, and naming them separately is what makes each
addressable. A Role also carries its own **state** — `ok | empty | blocked | loading` — with the
sentence explaining it as a Field like any other, so a face cannot collapse BLOCKED into empty and
no renderer authors English the Frame never supplied (R1.5).

Role ids and Field keys may not contain `.`, `[` or `]`. A path is a join, and over an
unrestricted alphabet a join is not injective: role `x` with key `y.z` and role `x.y` with key `z`
both address `x.y.z`, which silently merges two Fields and then reports a parity breach on a Frame
that is fine.

A Frame with no Fields at all is refused, because parity over zero paths passes without checking
anything.

### A View is the standing definition

Which Roles, in what order, at what **token budget per face**, addressed by a stable id. A View
selects; it never computes. Two rules, both fail-closed and both tested:

- **Unknown ids fail closed.** An unknown View or Role id throws an `UnknownIdError` carrying
  every known id. No fuzzy matching, no best-effort partial render. A View that selects an
  unregistered Role is refused at registration, so it never becomes addressable at all.
- **An over-budget View throws.** `BudgetExceededError`, carrying the budget, the spend and the
  tokenizer id. There is no truncation tier, no elision tier and no summarisation tier. An
  over-budget View is a defect the author must fix.

**The budget is per face, and it has to be.** Measured on this package's own fixture under its own
tokenizer, the markdown face spends **136** tokens and the data face **644** — 4.7× apart on eleven
Fields, widening with row count. One number is either too small for the data face or no limit at
all on the markdown one. So a View declares `budgets: { markdown: 200, data: 800 }`; `markdown` is
required, and a face with no entry is refused at render time rather than given an invented default.

Each Role declares its **markdown face** as data — a shape (`list` or `table`), a heading depth,
the exact key set it shows, labels, and where the provenance mark goes. It is declarative on
purpose: a face that cannot author a string cannot invent a value. A Role with no declared markdown
face, or no declared keys, cannot be registered. The declared key set is **exhaustive**, not a
subset: absent-not-hidden is structural, so there is no second, silent way to make a value
disappear. (Declared column subsetting for token economy — R2.3 — is therefore not available yet;
see Deferred below.)

### A Rendering is one serialization of a Frame

A Rendering **never invents or changes a value** — it chooses only glyphs, layout and token spend,
and it names the format and the tokenizer its accounting was done under.

There is exactly **one traversal** of a Frame, and every face is a sink adapter over it. The walk
computes each Field's canonical glyph and hands the finished string to the sink; the sink places
it. A sink is structurally never given the chance to author a value. Two sinks ship —
`markdownSink()` and `dataSink()` — and a React face is a third, written in the consumer, because
this package does not import React. Each shipped sink is **single-use**: it accumulates state and
has no reset, and a second `beginFrame` throws rather than silently concatenating two Frames.

**The sink declares what it emitted, and the walk is the oracle.** `endFrame()` returns a
`SinkReport` — the body plus the face's own claim about what it emitted, including the literal
fragments it wrote for each Field — and `renderFrame` reconciles that claim against the walk and
against the bytes. A sink that discards every value and returns a body of its own invention is
refused; so is one that declares bytes its body does not contain, and one that produces a body
while naming none of the bytes it wrote for a Field.

**Values cannot author structure.** The markdown sink escapes `|`, newlines and leading block
markers at its own boundary. A supplier string containing `\n## Shipment\n- **Status**: DELIVERED`
would otherwise forge a whole section in the agent face — and face parity would not catch it,
because the emitted *value* is exactly what the Frame held. It is the structure around it that was
invented.

**The markdown face is derived from Fields.** There is no HTML renderer here and no
HTML-to-markdown converter, and there never will be: laundering markup into markdown is how a face
stops being a serialization of the model and becomes a transcription of a screen.

## Face parity — the assertion that makes it real

> Every Field in the Frame appears in both Renderings, and neither Rendering invents one.

```ts
import { assertFaceParity, renderMarkdown, renderData } from '@mdxld/frame'

assertFaceParity(frame, [renderMarkdown(frame, { registry }), renderData(frame, { registry }), reactFace])
```

It also checks that each Rendering is of **this** Frame — same View, same snapshot token, same
`asOf`. Two faces of two different moments can agree perfectly and mean nothing.

The two text concessions are separate options: `textMustMatch` holds each face to the Frame's
canonical glyph, `facesMustAgree` holds the faces to each other. They used to be one flag, so a
face opting out of cross-face formatting also opted out of being checked against the record —
under which every value in a face could read `DELIVERED` and parity returned clean.

That one call is what lets a designer restructure any markup without breaking the agent face, and
it costs a great deal less than a pixel-perfect snapshot because it tests the claim that matters
(the faces say the same thing) rather than the one that does not (the markup did not move). It
catches a dropped Field, an invented path, a Field emitted twice, a `withheld` value laundered
into a bare absence, an absent value filled in with a zero, and — by default — a face that rounded
or re-formatted a number.

**What it cannot do, said plainly.** Parity compares *declared emissions*. A face written as a
`RenderSink` has its declaration generated by the one walk and reconciled against its own bytes
inside `renderFrame`, so it cannot declare one thing and write another. A face that declares its
emissions by hand (`declareRendering`) is being taken at its word about what it emitted; parity
holds that word against the Frame, but it cannot see bytes the face never declared. Even for a
sink, fragment reconciliation is occurrence-checking rather than a parse: it guarantees every
Field's honest glyph is in the bytes in the count the face declared, not that the face wrote
nothing else around them. Both are real limits, and the first is the reason to write faces as
sinks.

## Example

Executed as a test (`src/readme.test.ts`) — this block is a snapshot of what it actually prints.

```ts
import { createRegistry, makeFrame, present, absent, withheld, renderMarkdown, renderData, assertFaceParity } from '@mdxld/frame'

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

console.log(renderMarkdown(frame, { registry }).body)
assertFaceParity(frame, [renderMarkdown(frame, { registry }), renderData(frame, { registry })])
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

## Deferred, and why

Named here because a gap nobody wrote down is a gap someone re-discovers as a bug.

- **The degradation ladder (R4.2).** A declared per-Role degradation order — fewer rows, a declared
  column subset, summary-only — is a ratified requirement and it is **not implemented**. It is an
  open owner question (`dot-do/vis#361`), and until it is ruled, an over-budget View throws and
  nothing here truncates, elides or summarises. This package previously shipped two tests asserting
  that its export surface matched nothing like `/truncat|elid|summari|degrad/i` and
  `/stale|fresh|expire|age/i`. They have been **deleted**: they banned the ratified requirement's
  own vocabulary — and incidentally `page`, `pageSize`, `usage`, `coverage` — which made
  implementing the ruling fail CI. The behaviour they were reaching for (an over-budget View
  throws; this package decides nothing about staleness) is still tested, as behaviour.
- **Row-set partiality.** A Frame carries all its rows or it is over budget. Measured at ~10.7
  tokens per row, a 140-token worklist budget is four rows and a real queue is 20–200 — so the
  workaround today is a Frame assembled from a partial row set, which is the same lie one level up
  that this package exists to refuse. It depends on the R4.2 ruling and is the highest-value
  follow-up.
- **Role parameterisation.** Kestrel's `ParamSlot`/`bindArgs` — a Role taking arguments (`tape 5m`,
  `d-0`) — has no expression here, so R4.1–R4.4 cannot be fully served yet.
- **Declared column subsetting (R2.3).** See the note on exhaustive key sets above.
- **The data face is not the wire format.** It is versioned (`mdxld.frame.data/1`) so that it can
  become one. Nothing has run on it — no app has fetched it, no client has parsed it — and calling
  it a wire format before then would be a stability claim with no evidence.
- **The shipped tokenizer under-counts CJK.** `ceil(chars / 4)` counts UTF-16 code units against an
  English-prose ratio, so on CJK text it reports roughly a third to a fifth of real spend and
  therefore **fails open**. Pass a real tokenizer if a View's values are not mostly Latin script.

## Where this came from

The vocabulary — View, Frame, Field, Attribution, SourceWatermark, Rendering, Pane — is **shipped
and measured** in the `kestrel` trading terminal, and this package is a port of a proven design,
not an invention. `makeField`, `isHonestConfidence` and the construct-time refusal are kestrel's;
the one-walk / sink-adapter seam is kestrel's `walkKernel`; "an over-budget View is a defect the
author must fix" is kestrel's rule verbatim.

**What is NOT ported, stated precisely.** Kestrel's `Field` (`src/frame/types.ts`) has `value: T`
**required** and no absence state at all: an unavailable value is a `null` input the renderer turns
into `—`, or one of the four cell states in `PaneRefusal` (`src/frame/refusals.ts` — LATENT and
DEFECTIVE cells, each naming the train or the written reason behind it). Folding absence into the
value type is this package's addition, not kestrel's proof.

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
`isHonestConfidence` · `modelConfidence` · `hasValue` · `isBlank` · `deepFreeze` — the Field.

`makeFrame` · `walkFrame` · `framePaths` · `scalarPath` · `cellPath` · `assertAddressable` ·
`STATE_KEY` — the Frame.

`createRegistry` · `ViewRegistry` — the View.

`renderFrame` · `renderMarkdown` · `renderData` · `markdownSink` · `dataSink` ·
`declareRendering` · `escapeMarkdown` · `approxCharsPerToken` · `DATA_FACE_VERSION` — the
Rendering.

`faceParity` · `assertFaceParity` — the assertion.

`renderGlyph` · `valueText` · `provenanceMark` · `canonicalText` · `ABSENT_GLYPH` ·
`UNCONFIRMED_MARK` · `COLLIDES_WITH_A_PRESENCE_MARKER` — the one value serializer every face is
held to.

`FieldHonestyError` · `FrameError` · `UnknownIdError` · `BudgetExceededError` · `FaceParityError`
— every one of them thrown, never logged.

## Licence

MIT
