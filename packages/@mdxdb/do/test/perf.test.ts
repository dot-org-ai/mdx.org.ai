/**
 * Performance test for MDXDurableObject RPC
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unstable_dev, type UnstableDevWorker } from 'wrangler'
import { RPC } from 'rpc.do'

describe('MDXDurableObject Performance', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('dist/durable-object.bundled.js', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      persist: false,
    })
  }, 30000)

  afterAll(async () => {
    await worker?.stop()
  })

  it('measures single RPC call latency', async () => {
    const iterations = 20
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const db = RPC(`http://${worker.address}:${worker.port}`)
      const start = performance.now()
      await db.$id()
      const end = performance.now()
      times.push(end - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)]
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

    console.log('\n=== Single RPC Call ($id) ===')
    console.log(`Iterations: ${iterations}`)
    console.log(`Avg: ${avg.toFixed(2)}ms`)
    console.log(`Min: ${min.toFixed(2)}ms`)
    console.log(`Max: ${max.toFixed(2)}ms`)
    console.log(`P50: ${p50.toFixed(2)}ms`)
    console.log(`P95: ${p95.toFixed(2)}ms`)

    expect(avg).toBeLessThan(100) // Expect avg under 100ms locally
  })

  it('measures create latency', async () => {
    const iterations = 20
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const db = RPC(`http://${worker.address}:${worker.port}`)
      const start = performance.now()
      await db.create({
        type: 'PerfTest',
        data: { index: i, timestamp: Date.now() },
      })
      const end = performance.now()
      times.push(end - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)]
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

    console.log('\n=== Create Operation ===')
    console.log(`Iterations: ${iterations}`)
    console.log(`Avg: ${avg.toFixed(2)}ms`)
    console.log(`Min: ${min.toFixed(2)}ms`)
    console.log(`Max: ${max.toFixed(2)}ms`)
    console.log(`P50: ${p50.toFixed(2)}ms`)
    console.log(`P95: ${p95.toFixed(2)}ms`)

    expect(avg).toBeLessThan(100)
  })

  it('measures list latency', async () => {
    const iterations = 20
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const db = RPC(`http://${worker.address}:${worker.port}`)
      const start = performance.now()
      await db.list({ limit: 100 })
      const end = performance.now()
      times.push(end - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)]
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

    console.log('\n=== List Operation (limit 100) ===')
    console.log(`Iterations: ${iterations}`)
    console.log(`Avg: ${avg.toFixed(2)}ms`)
    console.log(`Min: ${min.toFixed(2)}ms`)
    console.log(`Max: ${max.toFixed(2)}ms`)
    console.log(`P50: ${p50.toFixed(2)}ms`)
    console.log(`P95: ${p95.toFixed(2)}ms`)

    expect(avg).toBeLessThan(100)
  })

  it('measures throughput with sequential creates', async () => {
    const count = 50
    const start = performance.now()

    for (let i = 0; i < count; i++) {
      const db = RPC(`http://${worker.address}:${worker.port}`)
      await db.create({
        type: 'ThroughputTest',
        data: { index: i },
      })
    }

    const end = performance.now()
    const totalTime = end - start
    const opsPerSec = (count / totalTime) * 1000

    console.log('\n=== Sequential Throughput ===')
    console.log(`Operations: ${count}`)
    console.log(`Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`Throughput: ${opsPerSec.toFixed(2)} ops/sec`)

    expect(opsPerSec).toBeGreaterThan(10) // At least 10 ops/sec locally
  })
})
