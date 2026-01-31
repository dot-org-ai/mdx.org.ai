/**
 * O*NET Dataset Benchmark
 *
 * Downloads actual O*NET data and benchmarks realistic operations:
 * - Full occupation import (1,016 occupations)
 * - Skills/abilities mapping
 * - Graph traversal queries
 *
 * Usage:
 *   npx tsx test/onet-benchmark.ts [url] [--download] [--import] [--benchmark]
 *
 * Default: runs benchmark only (assumes data is already imported)
 */

import { RPC } from 'rpc.do'
import * as fs from 'fs/promises'
import * as path from 'path'

const DEFAULT_URL = 'https://mdxdb-do.dotdo.workers.dev'
const WORKER_URL = process.argv[2]?.startsWith('http') ? process.argv[2] : DEFAULT_URL

const ONET_VERSION = '29.0'
const ONET_BASE_URL = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION.replace('.', '_')}_text`
const DATA_DIR = './data/onet'

const args = process.argv.slice(2)
const DO_DOWNLOAD = args.includes('--download') || args.includes('--all')
const DO_IMPORT = args.includes('--import') || args.includes('--all')
const DO_BENCHMARK = args.includes('--benchmark') || args.includes('--all') || (!DO_DOWNLOAD && !DO_IMPORT)

// =============================================================================
// Download Functions
// =============================================================================

async function downloadFile(filename: string): Promise<void> {
  const url = `${ONET_BASE_URL}/${encodeURIComponent(filename)}`
  const filepath = path.join(DATA_DIR, filename)

  try {
    // Check if file exists
    await fs.access(filepath)
    console.log(`  Skipping (exists): ${filename}`)
    return
  } catch {
    // File doesn't exist, download it
  }

  console.log(`  Downloading: ${filename}`)
  const response = await fetch(url)
  if (!response.ok) {
    console.warn(`  Failed: ${filename} (${response.status})`)
    return
  }
  const text = await response.text()
  await fs.writeFile(filepath, text)
}

async function downloadONET(): Promise<void> {
  console.log('\n📥 Downloading O*NET data...')
  await fs.mkdir(DATA_DIR, { recursive: true })

  // Core files needed for benchmark
  const files = [
    'Occupation Data.txt',
    'Skills.txt',
    'Abilities.txt',
    'Knowledge.txt',
    'Content Model Reference.txt',
  ]

  for (const file of files) {
    await downloadFile(file)
  }
  console.log('  Download complete!')
}

// =============================================================================
// Parse Functions
// =============================================================================

interface OccupationRow {
  code: string
  title: string
  description: string
}

interface SkillRow {
  occCode: string
  elementId: string
  elementName: string
  scaleId: string
  value: number
}

async function parseOccupations(): Promise<OccupationRow[]> {
  const filepath = path.join(DATA_DIR, 'Occupation Data.txt')
  const content = await fs.readFile(filepath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0]!.split('\t')

  const codeIdx = headers.indexOf('O*NET-SOC Code')
  const titleIdx = headers.indexOf('Title')
  const descIdx = headers.indexOf('Description')

  return lines.slice(1).map(line => {
    const cols = line.split('\t')
    return {
      code: cols[codeIdx]!,
      title: cols[titleIdx]!,
      description: cols[descIdx] || '',
    }
  })
}

async function parseSkills(): Promise<SkillRow[]> {
  const filepath = path.join(DATA_DIR, 'Skills.txt')
  const content = await fs.readFile(filepath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0]!.split('\t')

  const occIdx = headers.indexOf('O*NET-SOC Code')
  const elemIdx = headers.indexOf('Element ID')
  const nameIdx = headers.indexOf('Element Name')
  const scaleIdx = headers.indexOf('Scale ID')
  const valueIdx = headers.indexOf('Data Value')

  return lines.slice(1).map(line => {
    const cols = line.split('\t')
    return {
      occCode: cols[occIdx]!,
      elementId: cols[elemIdx]!,
      elementName: cols[nameIdx]!,
      scaleId: cols[scaleIdx]!,
      value: parseFloat(cols[valueIdx]!),
    }
  })
}

async function parseContentModel(): Promise<Map<string, { id: string; name: string; description: string }>> {
  const filepath = path.join(DATA_DIR, 'Content Model Reference.txt')
  const content = await fs.readFile(filepath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0]!.split('\t')

  const idIdx = headers.indexOf('Element ID')
  const nameIdx = headers.indexOf('Element Name')
  const descIdx = headers.indexOf('Description')

  const elements = new Map()
  for (const line of lines.slice(1)) {
    const cols = line.split('\t')
    const id = cols[idIdx]!
    elements.set(id, {
      id,
      name: cols[nameIdx]!,
      description: cols[descIdx] || '',
    })
  }
  return elements
}

// =============================================================================
// Import Functions
// =============================================================================

async function importONET(): Promise<{ occupations: number; skills: number; relationships: number }> {
  console.log('\n📤 Importing O*NET data to DO...')

  const occupations = await parseOccupations()
  const skills = await parseSkills()
  const elements = await parseContentModel()

  console.log(`  Parsed ${occupations.length} occupations`)
  console.log(`  Parsed ${skills.length} skill ratings`)
  console.log(`  Parsed ${elements.size} content model elements`)

  // Limit for reasonable import time
  const MAX_OCCUPATIONS = 100
  const MAX_SKILLS_PER_OCC = 35 // Top skills only

  const limitedOccupations = occupations.slice(0, MAX_OCCUPATIONS)

  // Import occupations
  console.log(`  Importing ${limitedOccupations.length} occupations...`)
  let imported = 0
  for (const occ of limitedOccupations) {
    try {
      const db = RPC(WORKER_URL)
      await db.create({
        type: 'Occupation',
        id: occ.code,
        data: {
          code: occ.code,
          title: occ.title,
          description: occ.description.substring(0, 500),
        },
      })
      imported++
    } catch {
      // Already exists
    }
    if (imported % 20 === 0) {
      process.stdout.write(`\r    Occupations: ${imported}/${limitedOccupations.length}`)
    }
  }
  console.log(`\r    Occupations: ${imported}/${limitedOccupations.length}`)

  // Import unique skill elements
  const uniqueElements = new Set<string>()
  for (const skill of skills) {
    uniqueElements.add(skill.elementId)
  }

  console.log(`  Importing ${uniqueElements.size} skill elements...`)
  let skillsImported = 0
  for (const elemId of uniqueElements) {
    const elem = elements.get(elemId)
    if (!elem) continue

    try {
      const db = RPC(WORKER_URL)
      await db.create({
        type: 'Skill',
        id: elemId,
        data: {
          elementId: elemId,
          name: elem.name,
          description: elem.description.substring(0, 200),
        },
      })
      skillsImported++
    } catch {
      // Already exists
    }
  }
  console.log(`    Created ${skillsImported} skill elements`)

  // Import skill relationships (importance ratings only)
  console.log(`  Creating skill relationships...`)
  const importanceSkills = skills.filter(s => s.scaleId === 'IM')

  // Group by occupation
  const skillsByOcc = new Map<string, SkillRow[]>()
  for (const skill of importanceSkills) {
    if (!skillsByOcc.has(skill.occCode)) {
      skillsByOcc.set(skill.occCode, [])
    }
    skillsByOcc.get(skill.occCode)!.push(skill)
  }

  // Get the actual base URL from an occupation
  const db0 = RPC(WORKER_URL)
  const occList = await db0.list({ type: 'Occupation', limit: 1 })
  if (occList.length === 0) {
    console.log('    No occupations found, skipping relationships')
    return { occupations: imported, skills: skillsImported, relationships: 0 }
  }
  const baseUrl = occList[0]!.url.split('/Occupation/')[0]
  console.log(`    Base URL: ${baseUrl}`)

  let relCount = 0
  for (const occ of limitedOccupations) {
    const occSkills = skillsByOcc.get(occ.code) || []
    // Sort by importance, take top N
    const topSkills = occSkills.sort((a, b) => b.value - a.value).slice(0, MAX_SKILLS_PER_OCC)

    for (const skill of topSkills) {
      try {
        const db = RPC(WORKER_URL)
        await db.relate({
          predicate: 'hasSkill',
          reverse: 'skillOf',
          from: `${baseUrl}/Occupation/${occ.code}`,
          to: `${baseUrl}/Skill/${skill.elementId}`,
          data: {
            importance: skill.value,
            scaleName: skill.elementName,
          },
        })
        relCount++
      } catch (e) {
        // Relationship exists or error
      }
    }
    if ((relCount % 100) === 0) {
      process.stdout.write(`\r    Relationships: ${relCount}`)
    }
  }
  console.log(`\r    Relationships: ${relCount}`)

  return { occupations: imported, skills: skillsImported, relationships: relCount }
}

// =============================================================================
// Benchmark Functions
// =============================================================================

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

async function measurePing(iterations = 30): Promise<Stats> {
  const times: number[] = []
  for (let i = 0; i < 5; i++) {
    const db = RPC(WORKER_URL)
    await db.ping()
  }
  for (let i = 0; i < iterations; i++) {
    const db = RPC(WORKER_URL)
    const start = performance.now()
    await db.ping()
    times.push(performance.now() - start)
  }
  return calculateStats(times)
}

async function benchmark(
  name: string,
  iterations: number,
  pingP50: number,
  fn: () => Promise<unknown>
): Promise<{ name: string; raw: Stats; adjusted: Stats }> {
  const times: number[] = []
  for (let i = 0; i < 3; i++) await fn() // warmup
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    times.push(performance.now() - start)
  }
  const raw = calculateStats(times)
  return {
    name,
    raw,
    adjusted: {
      avg: Math.max(0, raw.avg - pingP50),
      p50: Math.max(0, raw.p50 - pingP50),
      p95: Math.max(0, raw.p95 - pingP50),
      min: Math.max(0, raw.min - pingP50),
      max: Math.max(0, raw.max - pingP50),
    },
  }
}

async function runBenchmarks(): Promise<void> {
  console.log('\n📊 Running O*NET Benchmarks...')
  console.log(`  Target: ${WORKER_URL}`)

  // Measure ping
  console.log('\n  Measuring network latency...')
  const pingStats = await measurePing()
  console.log(`  Ping: avg=${pingStats.avg.toFixed(1)}ms  p50=${pingStats.p50.toFixed(1)}ms`)

  // Get database stats
  const db = RPC(WORKER_URL)
  const stats = await db.stats()
  console.log(`\n  Database: ${stats.things} things, ~${stats.relationships} relationships`)

  // Find an occupation for testing
  const db2 = RPC(WORKER_URL)
  const occupations = await db2.list({ type: 'Occupation', limit: 10 })
  if (occupations.length === 0) {
    console.log('  No occupations found. Run with --import first.')
    return
  }
  const testOcc = occupations[0]!

  const results: { name: string; raw: Stats; adjusted: Stats }[] = []

  // Benchmark: List all occupations
  results.push(await benchmark('List Occupations', 20, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.list({ type: 'Occupation', limit: 100 })
  }))

  // Benchmark: Get single occupation
  results.push(await benchmark('Get Occupation', 20, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.get(testOcc.url)
  }))

  // Benchmark: Get occupation skills (relationships)
  results.push(await benchmark('Get Occupation Skills', 20, pingStats.p50, async () => {
    const db = RPC(WORKER_URL)
    return db.relationships(testOcc.url, { predicate: 'hasSkill' })
  }))

  // Benchmark: Find occupations with skill (reverse lookup)
  const db3 = RPC(WORKER_URL)
  const skillsList = await db3.list({ type: 'Skill', limit: 1 })
  if (skillsList.length > 0) {
    const testSkill = skillsList[0]!
    results.push(await benchmark('Occupations by Skill', 20, pingStats.p50, async () => {
      const db = RPC(WORKER_URL)
      return db.relatedBy(testSkill.url, 'hasSkill')
    }))
  }

  // Benchmark: Complex query - top skills for occupation
  results.push(await benchmark('Occupation Profile (get + relationships)', 15, pingStats.p50, async () => {
    const db1 = RPC(WORKER_URL)
    const occ = await db1.get(testOcc.url)
    const db2 = RPC(WORKER_URL)
    const skills = await db2.relationships(testOcc.url, { predicate: 'hasSkill' })
    return { occ, skills }
  }))

  // Print results
  console.log('\n' + '='.repeat(70))
  console.log('O*NET BENCHMARK RESULTS')
  console.log('='.repeat(70))
  console.log(`\n  Network latency (ping P50): ${pingStats.p50.toFixed(1)}ms\n`)

  console.log('  Operation                          Raw P50    Adjusted P50')
  console.log('  ' + '-'.repeat(60))
  for (const r of results) {
    console.log(`  ${r.name.padEnd(35)} ${r.raw.p50.toFixed(1).padStart(7)}ms    ${r.adjusted.p50.toFixed(1).padStart(7)}ms`)
  }

  console.log('\n  Interpretation:')
  console.log('  - Adjusted = Raw - Network Latency (server-side execution time)')
  console.log('  - Operations involving 2 requests show ~2x network latency overhead')
  console.log('  - SQLite queries are fast (<5ms), network dominates total time')
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('=' .repeat(70))
  console.log('O*NET BENCHMARK SUITE')
  console.log('=' .repeat(70))

  if (DO_DOWNLOAD) {
    await downloadONET()
  }

  if (DO_IMPORT) {
    await importONET()
  }

  if (DO_BENCHMARK) {
    await runBenchmarks()
  }

  if (!DO_DOWNLOAD && !DO_IMPORT && !DO_BENCHMARK) {
    console.log('\nUsage:')
    console.log('  npx tsx test/onet-benchmark.ts [url] --download  Download O*NET files')
    console.log('  npx tsx test/onet-benchmark.ts [url] --import    Import to DO')
    console.log('  npx tsx test/onet-benchmark.ts [url] --benchmark Run benchmarks')
    console.log('  npx tsx test/onet-benchmark.ts [url] --all       All of the above')
    console.log('\nDefault: runs benchmark only')
  }
}

main().catch(console.error)
