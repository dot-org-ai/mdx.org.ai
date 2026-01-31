/**
 * Remote Performance Test for MDXDurableObject
 *
 * Tests the deployed worker at https://mdxdb-do.dotdo.workers.dev
 */

import { RPC } from 'rpc.do'

const WORKER_URL = 'https://mdxdb-do.dotdo.workers.dev'

interface PerfResult {
  operation: string
  iterations: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
}

function calculateStats(times: number[]): { avg: number; min: number; max: number; p50: number; p95: number } {
  const sorted = [...times].sort((a, b) => a - b)
  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    p50: sorted[Math.floor(sorted.length * 0.5)]!,
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
  }
}

async function measureLatency(name: string, iterations: number, fn: () => Promise<unknown>): Promise<PerfResult> {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < 3; i++) {
    await fn()
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }

  const stats = calculateStats(times)
  return { operation: name, iterations, ...stats }
}

function printResult(result: PerfResult) {
  console.log(`\n=== ${result.operation} ===`)
  console.log(`Iterations: ${result.iterations}`)
  console.log(`Avg: ${result.avg.toFixed(2)}ms`)
  console.log(`Min: ${result.min.toFixed(2)}ms`)
  console.log(`Max: ${result.max.toFixed(2)}ms`)
  console.log(`P50: ${result.p50.toFixed(2)}ms`)
  console.log(`P95: ${result.p95.toFixed(2)}ms`)
}

async function main() {
  console.log(`\nTesting deployed worker: ${WORKER_URL}\n`)
  console.log('=' .repeat(50))

  const results: PerfResult[] = []

  // Test $id
  const idResult = await measureLatency('$id() call', 20, async () => {
    const db = RPC(WORKER_URL)
    return db.$id()
  })
  results.push(idResult)
  printResult(idResult)

  // Test create
  const createResult = await measureLatency('create() call', 20, async () => {
    const db = RPC(WORKER_URL)
    return db.create({
      type: 'PerfTest',
      data: { timestamp: Date.now(), source: 'remote-perf' },
    })
  })
  results.push(createResult)
  printResult(createResult)

  // Test list
  const listResult = await measureLatency('list() call', 20, async () => {
    const db = RPC(WORKER_URL)
    return db.list({ limit: 100 })
  })
  results.push(listResult)
  printResult(listResult)

  // Test get (create first, then get)
  const db1 = RPC(WORKER_URL)
  const thing = await db1.create({
    type: 'GetTest',
    data: { value: 'test' },
  })
  const getResult = await measureLatency('get() call', 20, async () => {
    const db = RPC(WORKER_URL)
    return db.get(thing.url)
  })
  results.push(getResult)
  printResult(getResult)

  // Sequential throughput
  console.log('\n=== Sequential Throughput ===')
  const count = 50
  const start = performance.now()

  for (let i = 0; i < count; i++) {
    const db = RPC(WORKER_URL)
    await db.create({
      type: 'ThroughputTest',
      data: { index: i },
    })
  }

  const end = performance.now()
  const totalTime = end - start
  const opsPerSec = (count / totalTime) * 1000

  console.log(`Operations: ${count}`)
  console.log(`Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`Throughput: ${opsPerSec.toFixed(2)} ops/sec`)
  console.log(`Avg per op: ${(totalTime / count).toFixed(2)}ms`)

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`\nEndpoint: ${WORKER_URL}`)
  console.log(`\nLatency (P50):`)
  for (const r of results) {
    console.log(`  ${r.operation.padEnd(20)} ${r.p50.toFixed(2)}ms`)
  }
  console.log(`\nThroughput: ${opsPerSec.toFixed(2)} ops/sec`)
}

main().catch(console.error)
