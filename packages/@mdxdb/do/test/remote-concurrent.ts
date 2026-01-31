/**
 * Concurrent Performance Test for MDXDurableObject
 *
 * Tests parallel request handling on the deployed worker
 */

import { RPC } from 'rpc.do'

const WORKER_URL = 'https://mdxdb-do.dotdo.workers.dev'

async function testConcurrentCreates(concurrency: number, total: number) {
  console.log(`\n=== Concurrent Creates (concurrency=${concurrency}, total=${total}) ===`)

  const start = performance.now()
  const batches = Math.ceil(total / concurrency)

  for (let batch = 0; batch < batches; batch++) {
    const promises = []
    const batchSize = Math.min(concurrency, total - batch * concurrency)

    for (let i = 0; i < batchSize; i++) {
      const db = RPC(WORKER_URL)
      promises.push(
        db.create({
          type: 'ConcurrentTest',
          data: { batch, index: i, timestamp: Date.now() },
        })
      )
    }

    await Promise.all(promises)
  }

  const end = performance.now()
  const totalTime = end - start
  const opsPerSec = (total / totalTime) * 1000

  console.log(`Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`Throughput: ${opsPerSec.toFixed(2)} ops/sec`)
  console.log(`Avg per op: ${(totalTime / total).toFixed(2)}ms`)

  return opsPerSec
}

async function testConcurrentReads(concurrency: number, total: number) {
  // First create some items to read
  const db = RPC(WORKER_URL)
  const thing = await db.create({
    type: 'ReadTarget',
    data: { value: 'test' },
  })

  console.log(`\n=== Concurrent Gets (concurrency=${concurrency}, total=${total}) ===`)

  const start = performance.now()
  const batches = Math.ceil(total / concurrency)

  for (let batch = 0; batch < batches; batch++) {
    const promises = []
    const batchSize = Math.min(concurrency, total - batch * concurrency)

    for (let i = 0; i < batchSize; i++) {
      const db = RPC(WORKER_URL)
      promises.push(db.get(thing.url))
    }

    await Promise.all(promises)
  }

  const end = performance.now()
  const totalTime = end - start
  const opsPerSec = (total / totalTime) * 1000

  console.log(`Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`Throughput: ${opsPerSec.toFixed(2)} ops/sec`)
  console.log(`Avg per op: ${(totalTime / total).toFixed(2)}ms`)

  return opsPerSec
}

async function main() {
  console.log(`Testing concurrent performance: ${WORKER_URL}`)
  console.log('=' .repeat(60))

  const results: { test: string; concurrency: number; opsPerSec: number }[] = []

  // Test different concurrency levels for writes
  for (const concurrency of [1, 5, 10, 20]) {
    const opsPerSec = await testConcurrentCreates(concurrency, 50)
    results.push({ test: 'create', concurrency, opsPerSec })
  }

  // Test different concurrency levels for reads
  for (const concurrency of [1, 5, 10, 20]) {
    const opsPerSec = await testConcurrentReads(concurrency, 50)
    results.push({ test: 'get', concurrency, opsPerSec })
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('CONCURRENCY SUMMARY')
  console.log('='.repeat(60))
  console.log('\nCreate throughput by concurrency:')
  for (const r of results.filter(r => r.test === 'create')) {
    console.log(`  Concurrency ${r.concurrency.toString().padStart(2)}: ${r.opsPerSec.toFixed(2)} ops/sec`)
  }
  console.log('\nGet throughput by concurrency:')
  for (const r of results.filter(r => r.test === 'get')) {
    console.log(`  Concurrency ${r.concurrency.toString().padStart(2)}: ${r.opsPerSec.toFixed(2)} ops/sec`)
  }
}

main().catch(console.error)
