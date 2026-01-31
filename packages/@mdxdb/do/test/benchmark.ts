/**
 * Real-World Benchmark for MDXDurableObject
 *
 * Uses O*NET occupation data to test realistic graph operations.
 * Measures and subtracts network latency (ping) from results.
 *
 * Usage:
 *   npx tsx test/benchmark.ts [url]
 *
 * Default URL: https://mdxdb-do.dotdo.workers.dev
 */

import { RPC } from 'rpc.do'

const DEFAULT_URL = 'https://mdxdb-do.dotdo.workers.dev'
const WORKER_URL = process.argv[2] || DEFAULT_URL

// Sample O*NET occupations for testing
const SAMPLE_OCCUPATIONS = [
  { code: '15-1252.00', title: 'Software Developers', jobZone: 4 },
  { code: '15-1211.00', title: 'Computer Systems Analysts', jobZone: 4 },
  { code: '15-1299.08', title: 'Computer Systems Engineers/Architects', jobZone: 4 },
  { code: '15-1232.00', title: 'Computer User Support Specialists', jobZone: 3 },
  { code: '15-1244.00', title: 'Network and Computer Systems Administrators', jobZone: 4 },
  { code: '11-3021.00', title: 'Computer and Information Systems Managers', jobZone: 4 },
  { code: '15-2051.00', title: 'Data Scientists', jobZone: 5 },
  { code: '15-2031.00', title: 'Operations Research Analysts', jobZone: 5 },
  { code: '13-1111.00', title: 'Management Analysts', jobZone: 4 },
  { code: '13-2011.00', title: 'Accountants and Auditors', jobZone: 4 },
]

// Sample skills with importance/level ratings
const SAMPLE_SKILLS = [
  { id: '2.A.1.a', name: 'Reading Comprehension', category: 'Basic Skills' },
  { id: '2.A.1.b', name: 'Active Listening', category: 'Basic Skills' },
  { id: '2.A.1.c', name: 'Writing', category: 'Basic Skills' },
  { id: '2.A.1.d', name: 'Speaking', category: 'Basic Skills' },
  { id: '2.A.1.e', name: 'Mathematics', category: 'Basic Skills' },
  { id: '2.A.1.f', name: 'Science', category: 'Basic Skills' },
  { id: '2.A.2.a', name: 'Critical Thinking', category: 'Cross-Functional Skills' },
  { id: '2.A.2.b', name: 'Active Learning', category: 'Cross-Functional Skills' },
  { id: '2.A.2.c', name: 'Learning Strategies', category: 'Cross-Functional Skills' },
  { id: '2.B.1.a', name: 'Programming', category: 'Technical Skills' },
]

// Sample UNSPSC commodities (tools/tech)
const SAMPLE_COMMODITIES = [
  { code: '43230000', title: 'Software', segment: '43000000', family: '43230000' },
  { code: '43211500', title: 'Computers', segment: '43000000', family: '43210000' },
  { code: '43222600', title: 'Network Equipment', segment: '43000000', family: '43220000' },
  { code: '81110000', title: 'Computer Services', segment: '81000000', family: '81110000' },
  { code: '43232100', title: 'Database Software', segment: '43000000', family: '43230000' },
]

interface BenchmarkResult {
  operation: string
  raw: { avg: number; p50: number; p95: number }
  adjusted: { avg: number; p50: number; p95: number }
  iterations: number
}

interface Stats {
  avg: number
  p50: number
  p95: number
  min: number
  max: number
}

function calculateStats(times: number[]): Stats {
  const sorted = [...times].sort((a, b) => a - b)
  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    p50: sorted[Math.floor(sorted.length * 0.5)]!,
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
  }
}

async function measurePing(iterations = 50): Promise<Stats> {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < 5; i++) {
    const db = RPC(WORKER_URL)
    await db.ping()
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const db = RPC(WORKER_URL)
    const start = performance.now()
    await db.ping()
    const end = performance.now()
    times.push(end - start)
  }

  return calculateStats(times)
}

async function benchmark(
  name: string,
  iterations: number,
  pingLatency: number,
  fn: () => Promise<unknown>
): Promise<BenchmarkResult> {
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

  const raw = calculateStats(times)
  const adjusted = {
    avg: Math.max(0, raw.avg - pingLatency),
    p50: Math.max(0, raw.p50 - pingLatency),
    p95: Math.max(0, raw.p95 - pingLatency),
  }

  return { operation: name, raw, adjusted, iterations }
}

function printResult(result: BenchmarkResult, pingP50: number) {
  console.log(`\n=== ${result.operation} ===`)
  console.log(`  Raw:      avg=${result.raw.avg.toFixed(1)}ms  p50=${result.raw.p50.toFixed(1)}ms  p95=${result.raw.p95.toFixed(1)}ms`)
  console.log(`  Adjusted: avg=${result.adjusted.avg.toFixed(1)}ms  p50=${result.adjusted.p50.toFixed(1)}ms  p95=${result.adjusted.p95.toFixed(1)}ms`)
  console.log(`  (ping=${pingP50.toFixed(1)}ms subtracted)`)
}

async function getOrCreate(
  type: string,
  id: string,
  data: Record<string, unknown>
): Promise<string> {
  const db = RPC(WORKER_URL)
  // Try to get existing
  const existing = await db.getById(type, id)
  if (existing) {
    return existing.url
  }

  // Create new
  const db2 = RPC(WORKER_URL)
  const thing = await db2.create({ type, id, data })
  return thing.url
}

async function setupTestData(): Promise<{ occupations: string[]; skills: string[]; commodities: string[] }> {
  console.log('\n📊 Setting up test data...')

  const occupationUrls: string[] = []
  const skillUrls: string[] = []
  const commodityUrls: string[] = []

  // Create or get occupations
  for (const occ of SAMPLE_OCCUPATIONS) {
    const url = await getOrCreate('Occupation', occ.code, {
      code: occ.code,
      title: occ.title,
      jobZone: occ.jobZone,
    })
    occupationUrls.push(url)
  }
  console.log(`  Loaded ${SAMPLE_OCCUPATIONS.length} occupations`)

  // Create or get skills
  for (const skill of SAMPLE_SKILLS) {
    const url = await getOrCreate('Skill', skill.id, {
      elementId: skill.id,
      name: skill.name,
      category: skill.category,
    })
    skillUrls.push(url)
  }
  console.log(`  Loaded ${SAMPLE_SKILLS.length} skills`)

  // Create or get commodities
  for (const comm of SAMPLE_COMMODITIES) {
    const url = await getOrCreate('UNSPSCCommodity', comm.code, comm)
    commodityUrls.push(url)
  }
  console.log(`  Loaded ${SAMPLE_COMMODITIES.length} commodities`)

  // Create relationships if they don't exist (relate is idempotent)
  let relCount = 0
  for (const occUrl of occupationUrls) {
    for (const skillUrl of skillUrls.slice(0, 5)) { // 5 skills per occupation
      try {
        const db = RPC(WORKER_URL)
        await db.relate({
          predicate: 'hasSkill',
          reverse: 'skillOf',
          from: occUrl,
          to: skillUrl,
          data: {
            importance: { scale: 'IM', value: 3 + Math.random() * 2 },
            level: { scale: 'LV', value: 3 + Math.random() * 4 },
          },
        })
        relCount++
      } catch {
        // Relationship may already exist
      }
    }
  }
  console.log(`  Set up ${relCount} occupation->skill relationships`)

  // Create relationships: occupation -> tools
  let toolRelCount = 0
  for (const occUrl of occupationUrls.slice(0, 5)) {
    for (const commUrl of commodityUrls) {
      try {
        const db = RPC(WORKER_URL)
        await db.relate({
          predicate: 'usesTool',
          reverse: 'usedBy',
          from: occUrl,
          to: commUrl,
          data: { hotTechnology: Math.random() > 0.7 },
        })
        toolRelCount++
      } catch {
        // Relationship may already exist
      }
    }
  }
  console.log(`  Set up ${toolRelCount} occupation->tool relationships`)

  // Create relationships: related occupations
  for (let i = 0; i < occupationUrls.length - 1; i++) {
    try {
      const db = RPC(WORKER_URL)
      await db.relate({
        predicate: 'relatedTo',
        reverse: 'relatedTo',
        from: occupationUrls[i]!,
        to: occupationUrls[i + 1]!,
      })
    } catch {
      // Relationship may already exist
    }
  }
  console.log(`  Set up related occupation links`)

  return { occupations: occupationUrls, skills: skillUrls, commodities: commodityUrls }
}

async function main() {
  console.log(`\n🚀 Real-World Benchmark: ${WORKER_URL}`)
  console.log('=' .repeat(60))

  // Step 1: Measure ping latency
  console.log('\n⏱️  Measuring network latency (ping)...')
  const pingStats = await measurePing(50)
  console.log(`  Ping: avg=${pingStats.avg.toFixed(1)}ms  p50=${pingStats.p50.toFixed(1)}ms  p95=${pingStats.p95.toFixed(1)}ms`)

  // Step 2: Setup test data
  const { occupations, skills, commodities } = await setupTestData()

  // Step 3: Run benchmarks
  console.log('\n📈 Running benchmarks...')
  const results: BenchmarkResult[] = []

  // Benchmark: Get single occupation
  results.push(await benchmark('Get Occupation', 30, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.get(occupations[0]!)
  }))

  // Benchmark: List all occupations
  results.push(await benchmark('List Occupations', 30, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.list({ type: 'Occupation', limit: 100 })
  }))

  // Benchmark: Get relationships (occupation -> skills)
  results.push(await benchmark('Get Relationships', 30, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.relationships(occupations[0]!, { predicate: 'hasSkill' })
  }))

  // Benchmark: Reverse lookup (skill -> occupations)
  results.push(await benchmark('Reverse Lookup (skillOf)', 30, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.relatedBy(skills[0]!, 'hasSkill')
  }))

  // Benchmark: Graph traversal (occupation -> skills -> other occupations)
  results.push(await benchmark('Graph Traversal', 20, pingStats.p50, async () => {
    const db1 = RPC(WORKER_URL)
    const rels = await db1.relationships(occupations[0]!, { predicate: 'hasSkill' })

    // Get one skill's related occupations
    if (rels.length > 0) {
      const db2 = RPC(WORKER_URL)
      await db2.relatedBy(rels[0].to, 'hasSkill')
    }
  }))

  // Benchmark: Create with relationship
  results.push(await benchmark('Create + Relate', 20, pingStats.p50, async () => {
    const db1 = RPC(WORKER_URL)
    const thing = await db1.create({
      type: 'TestOccupation',
      data: { title: 'Test', timestamp: Date.now() },
    })

    const db2 = RPC(WORKER_URL)
    await db2.relate({
      predicate: 'hasSkill',
      reverse: 'skillOf',
      from: thing.url,
      to: skills[0]!,
      data: { importance: { scale: 'IM', value: 4 } },
    })
  }))

  // Benchmark: Get stats
  results.push(await benchmark('Stats Query', 10, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.stats()
  }))

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('BENCHMARK RESULTS')
  console.log('='.repeat(60))

  for (const result of results) {
    printResult(result, pingStats.p50)
  }

  // Summary table
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY (Adjusted P50 - network latency removed)')
  console.log('='.repeat(60))
  console.log(`\n  Network latency (ping P50): ${pingStats.p50.toFixed(1)}ms\n`)
  console.log('  Operation                   Adjusted P50')
  console.log('  ' + '-'.repeat(45))
  for (const r of results) {
    console.log(`  ${r.operation.padEnd(28)} ${r.adjusted.p50.toFixed(1)}ms`)
  }

  // Final stats
  const db = RPC(WORKER_URL)
  const finalStats = await db.stats()
  console.log('\n' + '='.repeat(60))
  console.log('DATABASE STATE')
  console.log('='.repeat(60))
  console.log(`  Total things: ${finalStats.things}`)
  console.log(`  Estimated relationships: ${finalStats.relationships}`)
  console.log('  Types:')
  for (const t of finalStats.types.slice(0, 10)) {
    console.log(`    ${t.type}: ${t.count}`)
  }
}

main().catch(console.error)
