/**
 * Benchmark harness: startup ms (lazy import + mount), install bytes, repaint ms per streamed
 * frame. Emits a JSON-serialisable {@link BenchmarkReport} so Ink and OpenTUI can be compared
 * on the same numbers.
 */

import type { InputEvent, ViewerFactory } from './types'
import { createQueue } from './input'
import { createFakeTerminal, frameFixtures } from './conformance'

export interface BenchmarkOptions {
  /** Frames to stream; each is painted `repaints` times. */
  frames?: readonly string[]
  /** How many times the frame list is streamed. Default 20. */
  repaints?: number
  /** Directory whose recursive size is reported as `installBytes` (e.g. the viewer package + its deps). */
  installDir?: string
  /** Precomputed install size, when the caller already knows it. */
  installBytes?: number
  columns?: number
  rows?: number
}

export interface RepaintStats {
  readonly frames: number
  readonly meanMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly maxMs: number
}

export interface BenchmarkReport {
  readonly viewer: string
  readonly at: string
  readonly runtime: string
  readonly startupMs: number
  readonly installBytes: number | null
  /** Number of packages under the measured install, when the caller counted them. */
  readonly installPackages?: number
  readonly repaint: RepaintStats
  readonly samplesMs: readonly number[]
}

const now = (): number => performance.now()

function stats(samples: readonly number[]): RepaintStats {
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
  const sum = sorted.reduce((a, b) => a + b, 0)
  const round = (n: number): number => Math.round(n * 1000) / 1000
  return {
    frames: sorted.length,
    meanMs: round(sorted.length ? sum / sorted.length : 0),
    p50Ms: round(at(0.5)),
    p95Ms: round(at(0.95)),
    maxMs: round(sorted.at(-1) ?? 0),
  }
}

/** Recursive byte size of a directory. Lazily imports `node:fs/promises`; never on the hot path. */
export async function measureInstallBytes(dir: string): Promise<number> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  let total = 0
  const walk = async (d: string): Promise<void> => {
    const entries = await fs.readdir(d, { withFileTypes: true })
    await Promise.all(
      entries.map(async (e) => {
        const p = path.join(d, e.name)
        if (e.isSymbolicLink()) return
        if (e.isDirectory()) return walk(p)
        const st = await fs.stat(p)
        total += st.size
      }),
    )
  }
  await walk(dir)
  return total
}

function runtimeLabel(): string {
  const g = globalThis as { Bun?: { version: string }; process?: { version?: string } }
  if (g.Bun) return `bun ${g.Bun.version}`
  if (g.process?.version) return `node ${g.process.version}`
  return 'unknown'
}

/** Mount the viewer against a fake TTY, stream frames, and record timings. */
export async function benchmark(factory: ViewerFactory, opts: BenchmarkOptions = {}): Promise<BenchmarkReport> {
  const frames = opts.frames ?? frameFixtures.filter((f) => f.length > 0)
  const repaints = opts.repaints ?? 20
  const term = createFakeTerminal({ columns: opts.columns, rows: opts.rows })
  const input = createQueue<InputEvent>()
  const stream = createQueue<string>()

  const t0 = now()
  const viewer = await factory()
  const handle = await viewer.mount(stream.iterable, { terminal: term, events: input.iterable })
  const startupMs = now() - t0

  const samplesMs: number[] = []
  for (let i = 0; i < repaints; i++) {
    for (const frame of frames) {
      const painted = handle.nextPaint()
      const t = now()
      stream.push(frame)
      await painted
      samplesMs.push(now() - t)
      term.drain()
    }
  }
  await viewer.unmount()
  input.close()
  stream.close()

  const installBytes =
    opts.installBytes ?? (opts.installDir ? await measureInstallBytes(opts.installDir) : null)

  return {
    viewer: viewer.name,
    at: new Date().toISOString(),
    runtime: runtimeLabel(),
    startupMs: Math.round(startupMs * 1000) / 1000,
    installBytes,
    repaint: stats(samplesMs),
    samplesMs: samplesMs.map((s) => Math.round(s * 1000) / 1000),
  }
}

/** The JSON the harness emits. */
export function formatReport(report: BenchmarkReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : undefined)
}
