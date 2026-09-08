# @mdxe/ink benchmark

Recorded run of `pnpm --filter @mdxe/ink bench` (the shared `@mdxe/tui/benchmark` harness against a fake 80×24 TTY, 50 repaints of the four non-empty conformance fixture frames). Re-run and replace this file when the viewer or its dependencies change.

| | ink (this package) | stub (`@mdxe/tui/stub`, same harness) |
|---|---|---|
| runtime | node v22.21.1 (macOS arm64) | node v22.21.1 |
| `startupMs` (lazy import of ink + react, then mount) | 160.2 | 0.142 |
| `installBytes` (ink, react and transitive deps, each once by real path) | 8,031,069 (39 packages) | 450,444 (`dist` only) |
| repaint `p50Ms` | 0.222 | 0.001 |
| repaint `p95Ms` | 0.598 | 0.01 |
| repaint `maxMs` | 7.303 | 0.08 |
| repaint `meanMs` | 0.321 | 0.003 |

Recorded 2026-09-08 on a machine under heavy concurrent load (load average ≈ 7–18 on other workloads); the numbers are an upper bound, not a quiet-machine figure.

## What the numbers say

- **Startup is the framework.** ~160 ms is the cost of importing `ink` + `react` on first `mount()`. Nothing is paid by an importer of `@mdxe/ink` that never mounts (a pipe, an agent), which is why the import is lazy.
- **Repaint is sub-millisecond** because each frame is laid out at the terminal's real width. Ink's layout (Yoga) cost is linear in the column count: laying out at `1 << 20` columns to "disable wrapping" costs about 800–1000 ms per frame on the same machine, which is why the viewer never does that — a line wider than the terminal falls back to the verbatim register bytes instead.
- **Install size** is ink + react + 37 transitive packages. It is the price of the no-native-binary viewer; `@mdxe/opentui` should be compared on the same three numbers.

Raw JSON for the ink run:

```json
{
  "viewer": "ink",
  "at": "2026-09-08T16:13:36.368Z",
  "runtime": "node v22.21.1",
  "startupMs": 160.2,
  "installBytes": 8031069,
  "repaint": { "frames": 200, "meanMs": 0.321, "p50Ms": 0.222, "p95Ms": 0.598, "maxMs": 7.303 },
  "installPackages": 39
}
```
