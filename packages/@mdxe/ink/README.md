# @mdxe/ink

The Ink viewer for the [`@mdxe/tui`](../tui) seam. It displays `@mdxui/text` register bytes in the terminal through Ink 7 and handles input; it never renders MDX, never invents or changes a byte, and never attaches to a pipe.

Ink stays the no-native-binary viewer: Node ≥ 22 and Bun, `ink ^7` and `react ^19.2` as peers.

```bash
pnpm add @mdxe/ink ink react
```

## Usage

```ts
import { createInkViewer } from '@mdxe/ink'

const viewer = createInkViewer()
const handle = await viewer.mount(frames, {
  terminal: { stdout: process.stdout, stdin: process.stdin },
})
handle.onAction((action) => {
  // quit | scroll | page | jump | select | back | search | insert | resize — the host decides what they mean
})
await viewer.unmount()
```

`frames` is a `FrameStream` (`AsyncIterable<Uint8Array | string>`): each chunk is one complete frame from the renderer. Input is decoded from `stdin` by the seam's shared `createInputSource` and mapped through `defaultKeymap`; pass `events` and/or `keymap` on mount to supply your own.

For hosts that choose a viewer at runtime, `inkViewer(options)` is a `ViewerFactory` that imports even this package's viewer module lazily:

```ts
import { inkViewer } from '@mdxe/ink'
const factory = inkViewer()
const viewer = await factory()
```

## What it guarantees

- **Lazy.** Importing `@mdxe/ink` loads neither `ink` nor `react`; `mount()` does, after the TTY guard has passed. A pipe never pays for the framework.
- **Never on pipes.** When `stdout` or `stdin` is not a TTY, `mount()` rejects with `ViewerError` whose `code` is the stable string `NOT_A_TTY`, writes nothing and never touches raw mode. Route agents to the plain register bytes instead.
- **`strip(paint(bytes)) === bytes`.** Each frame is laid out with Ink's `renderToString` and compared to the register bytes before it is written. Ink trims trailing whitespace per line and wraps lines wider than its layout width; whenever it would alter a byte the frame is written verbatim instead, so the invariant holds unconditionally and Ink never wraps a line — the terminal does.
- **Terminal-width layout.** Each paint lays out at `terminal.stdout.columns` (so a resize is honoured; `DEFAULT_COLUMNS` = 80 when unreported). Ink's layout cost is linear in the width, so wrapping is not "disabled" with a huge width — that costs about a second per frame through Yoga — it is prevented by the verbatim fallback above.
- **Unmount releases.** Raw mode is released, the cursor restored, and nothing is written afterwards. `unmount()` is idempotent; a `quit` action unmounts.

The `@mdxe/tui/conformance` suite is run against this viewer in `src/viewer.test.ts`.

## Options

```ts
createInkViewer({ columns?: number }) // fixed Ink layout width; default: terminal.stdout.columns, else DEFAULT_COLUMNS (80)
```

`paint(frame, runtime, columns?)` is exported as a pure function for tests and hosts that want the laid-out bytes without a terminal; it reports which engine produced them (`ink` or `verbatim`).

## Benchmark

`pnpm --filter @mdxe/ink bench` runs the shared harness (`@mdxe/tui/benchmark`) against a fake 80×24 TTY and prints JSON. `installBytes` counts `ink`, `react` and their transitive dependencies once each by real path.

See `BENCHMARK.md` for the recorded run.

## Related

| Package | Role |
|---------|------|
| [@mdxe/tui](../tui) | The seam: `Viewer`, input abstraction, conformance suite, benchmark harness |
| [ink](https://www.npmjs.com/package/ink) | React for CLIs |

MIT
