import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { benchmark, formatReport, measureInstallBytes } from './benchmark'
import { createStubViewer } from './stub'

describe('benchmark harness', () => {
  it('emits JSON with startup ms, install bytes and repaint ms', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mdxe-tui-bench-'))
    await mkdir(join(dir, 'nested'))
    await writeFile(join(dir, 'a.js'), 'x'.repeat(100))
    await writeFile(join(dir, 'nested', 'b.js'), 'y'.repeat(50))

    const report = await benchmark(() => createStubViewer(), { repaints: 3, installDir: dir })
    const json = formatReport(report)
    const parsed = JSON.parse(json) as typeof report

    expect(parsed.viewer).toBe('stub')
    expect(parsed.installBytes).toBe(150)
    expect(parsed.startupMs).toBeGreaterThanOrEqual(0)
    expect(parsed.repaint.frames).toBe(3 * 4)
    expect(parsed.samplesMs).toHaveLength(12)
    expect(parsed.repaint.p95Ms).toBeGreaterThanOrEqual(parsed.repaint.p50Ms)
    expect(parsed.repaint.maxMs).toBeGreaterThanOrEqual(parsed.repaint.p95Ms)
    expect(parsed.runtime).toMatch(/^(node|bun) /)
    expect(Date.parse(parsed.at)).not.toBeNaN()
  })

  it('accepts a precomputed install size and leaves it null when unknown', async () => {
    expect((await benchmark(() => createStubViewer(), { repaints: 1, installBytes: 42 })).installBytes).toBe(42)
    expect((await benchmark(() => createStubViewer(), { repaints: 1 })).installBytes).toBeNull()
  })

  it('measureInstallBytes skips symlinks and sums files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mdxe-tui-size-'))
    await writeFile(join(dir, 'f'), 'abc')
    expect(await measureInstallBytes(dir)).toBe(3)
  })
})
