# @mdxe/tui

The viewer seam. Renderers are pure tree → bytes (`@mdxui/text`); a TUI is a **shell** that displays those bytes and handles input. It is never a fourth renderer (Kestrel ADR-0052 §4).

Two viewers — `@mdxe/ink` and `@mdxe/opentui` — implement one interface so the framework choice stops mattering. This package holds the interface, the input abstraction, the conformance suite they both must pass, and the benchmark harness that compares them on the same numbers.

The root entry has zero dependencies and imports no framework. Everything heavier is a subpath export, loaded only when asked for.

## The seam

```ts
import type { Viewer, FrameStream, ViewerInput, MountHandle } from '@mdxe/tui'

interface Viewer {
  readonly name: string
  mount(stream: FrameStream, input: ViewerInput): Promise<MountHandle> // rejects ViewerError('NOT_A_TTY') off a TTY
  unmount(): Promise<void> // releases raw mode; idempotent
}
```

- `FrameStream` — `AsyncIterable<Uint8Array | string>`; each chunk is one complete register frame from the renderer.
- `ViewerInput` — `{ terminal, events?, keymap? }`. `terminal` is `{ stdout, stdin }` (pass `process.*` or a fake). `events` is a decoded `InputSource`; when omitted the viewer decodes `terminal.stdin` with `createInputSource`. `keymap` defaults to `defaultKeymap`.
- `MountHandle` — `nextPaint()`, `onAction(listener)`, `painted`.

Input is decoded once, identically, for every viewer: `decodeInput(bytes) → InputEvent[]` (`key` | `paste` | `resize`), then `Keymap: InputEvent → Action | null`. Actions are `quit`, `scroll`, `page`, `jump`, `select`, `back`, `search`, `insert`, `resize`. The host decides what they mean.

## Contract (what the conformance suite checks)

1. **`strip(paint(bytes)) === bytes`** — every fixture frame, captured from stdout with ANSI stripped, equals the plain register bytes. Exactly: no added status line, no dropped trailing newline.
2. **Same actions** — key, paste and resize fixtures map to the same `Action[]` as `mapActions(events, keymap)`.
3. **Never on pipes** — with a non-TTY stdout *or* stdin, `mount` rejects `NOT_A_TTY`, writes nothing, never calls `setRawMode` (raw mode fails open on pipes; the caller check routes agents to plain bytes).
4. **Unmount releases** — raw mode entered N times is released N times, nothing is written after unmount, unmount is idempotent, and a `quit` action unmounts.

```ts
// in @mdxe/ink or @mdxe/opentui tests
import { describe, it } from 'vitest'
import { describeViewerConformance } from '@mdxe/tui/conformance'

describeViewerConformance('ink', () => import('../src/viewer').then((m) => m.createInkViewer()), { describe, it })
```

`runConformance(factory)` returns a `{ viewer, ok, results[] }` report for runners without `describe`/`it`. `createFakeTerminal()` is exported for your own tests.

## Benchmark

```ts
import { benchmark, formatReport } from '@mdxe/tui/benchmark'

const report = await benchmark(() => import('@mdxe/ink/viewer').then((m) => m.createInkViewer()), {
  installDir: 'node_modules/ink', // recursive bytes → installBytes
  repaints: 50,
})
console.log(formatReport(report))
```

Emits JSON: `startupMs` (lazy import + mount), `installBytes`, `repaint: { frames, meanMs, p50Ms, p95Ms, maxMs }`, `samplesMs`, `runtime`, `at`. `pnpm --filter @mdxe/tui bench` runs it against the stub.

## Reference implementation

`@mdxe/tui/stub` is the ~80-line viewer the suite is proven against. It bolds each line behind a clear-screen, maps input through the shared keymap, refuses non-TTYs, and releases raw mode on unmount. An Ink or OpenTUI viewer should read like it with a framework in the middle.
