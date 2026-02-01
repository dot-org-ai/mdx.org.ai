/**
 * Full O*NET Database Import
 *
 * Imports the complete O*NET database with concurrent operations:
 * - 1,016 occupations + ~27,000 entities
 * - ~350,000+ relationship edges with metadata
 *
 * Usage:
 *   npx tsx test/onet-full-import.ts [url] --download          # Download all files
 *   npx tsx test/onet-full-import.ts [url] --import            # Import everything
 *   npx tsx test/onet-full-import.ts [url] --import -c 20      # Import with concurrency 20
 *   npx tsx test/onet-full-import.ts [url] --stats             # Show database stats
 *   npx tsx test/onet-full-import.ts [url] --benchmark         # Benchmark queries
 */

import { RPC } from 'rpc.do'
import * as fs from 'fs/promises'
import * as path from 'path'

const DEFAULT_URL = 'https://mdxdb-do.dotdo.workers.dev'
const WORKER_URL = process.argv.find(a => a.startsWith('http')) || DEFAULT_URL

const ONET_VERSION = '29.0'
const ONET_BASE_URL = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION.replace('.', '_')}_text`
const DATA_DIR = './data/onet-full'

const args = process.argv.slice(2)
const DO_DOWNLOAD = args.includes('--download')
const DO_IMPORT = args.includes('--import')
const DO_STATS = args.includes('--stats')
const DO_BENCH = args.includes('--benchmark')

const concurrencyIdx = args.indexOf('-c')
const CONCURRENCY = concurrencyIdx >= 0 ? parseInt(args[concurrencyIdx + 1]!) : 15

const ONET_FILES = {
  occupations: 'Occupation Data.txt',
  contentModel: 'Content Model Reference.txt',
  tasks: 'Task Statements.txt',
  dwas: 'DWA Reference.txt',
  iwas: 'IWA Reference.txt',
  jobZones: 'Job Zone Reference.txt',
  jobZoneRef: 'Job Zones.txt',
  scales: 'Scales Reference.txt',
  education: 'Education, Training, and Experience.txt',
  educationCategories: 'Education, Training, and Experience Categories.txt',
  skills: 'Skills.txt',
  abilities: 'Abilities.txt',
  knowledge: 'Knowledge.txt',
  workActivities: 'Work Activities.txt',
  workContext: 'Work Context.txt',
  workStyles: 'Work Styles.txt',
  interests: 'Interests.txt',
  workValues: 'Work Values.txt',
  taskRatings: 'Task Ratings.txt',
  tasksToDWAs: 'Tasks to DWAs.txt',
  toolsUsed: 'Tools Used.txt',
  technologySkills: 'Technology Skills.txt',
  unspscReference: 'UNSPSC Reference.txt',
  relatedOccupations: 'Related Occupations.txt',
  alternateTitles: 'Alternate Titles.txt',
  skillsToWorkActivities: 'Skills to Work Activities.txt',
  abilitiesToWorkActivities: 'Abilities to Work Activities.txt',
}

// =============================================================================
// Concurrent batch runner
// =============================================================================

async function batch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  label: string,
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0
  let idx = 0
  const startTime = Date.now()

  async function worker() {
    while (idx < items.length) {
      const i = idx++
      try {
        await fn(items[i]!)
        success++
      } catch {
        failed++
      }
      const total = success + failed
      if (total % Math.max(1, Math.floor(items.length / 40)) === 0 || total === items.length) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = total / elapsed
        const eta = (items.length - total) / rate
        process.stdout.write(
          `\r  ${label}: ${total}/${items.length} (${rate.toFixed(0)}/s, ETA ${eta.toFixed(0)}s)  `
        )
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  console.log()
  return { success, failed }
}

// =============================================================================
// Download
// =============================================================================

async function downloadAll(): Promise<void> {
  console.log('\n📥 Downloading O*NET database...')
  await fs.mkdir(DATA_DIR, { recursive: true })

  for (const [, filename] of Object.entries(ONET_FILES)) {
    const filepath = path.join(DATA_DIR, filename)
    try {
      await fs.access(filepath)
      const stat = await fs.stat(filepath)
      if (stat.size > 100) {
        console.log(`  ✓ ${filename} (cached)`)
        continue
      }
    } catch {}

    console.log(`  ⬇ ${filename}`)
    try {
      const url = `${ONET_BASE_URL}/${encodeURIComponent(filename)}`
      const resp = await fetch(url)
      if (!resp.ok) { console.log(`    ❌ ${resp.status}`); continue }
      await fs.writeFile(filepath, await resp.text())
      console.log(`    ✓ done`)
    } catch (e) {
      console.log(`    ❌ ${e}`)
    }
  }
}

// =============================================================================
// Parse
// =============================================================================

interface Row { [key: string]: string }

async function parseFile(filename: string): Promise<Row[]> {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8')
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0]!.split('\t')
    return lines.slice(1).map(line => {
      const cols = line.split('\t')
      const row: Row = {}
      headers.forEach((h, i) => { row[h] = cols[i] || '' })
      return row
    })
  } catch {
    return []
  }
}

// =============================================================================
// Import
// =============================================================================

let baseUrl = ''
let totalThings = 0
let totalRels = 0

async function getBaseUrl(): Promise<string> {
  if (baseUrl) return baseUrl
  const db = RPC(WORKER_URL)
  baseUrl = await db.$id()
  return baseUrl
}

function makeUrl(type: string, id: string): string {
  return `${baseUrl}/${type}/${id}`
}

async function importEntities(
  type: string,
  rows: { id: string; data: Record<string, unknown> }[],
  label: string,
): Promise<Map<string, string>> {
  console.log(`\n📋 ${label} (${rows.length})`)
  const urlMap = new Map<string, string>()

  const result = await batch(rows, CONCURRENCY, async (item) => {
    const db = RPC(WORKER_URL)
    await db.create({ type, id: item.id, data: item.data })
  }, label)

  totalThings += result.success
  for (const item of rows) {
    urlMap.set(item.id, makeUrl(type, item.id))
  }

  console.log(`  → Created: ${result.success}, Skipped: ${result.failed}`)
  return urlMap
}

async function importRelationships(
  items: { predicate: string; reverse: string; from: string; to: string; data?: Record<string, unknown> }[],
  label: string,
): Promise<void> {
  console.log(`\n🔗 ${label} (${items.length})`)

  const result = await batch(items, CONCURRENCY, async (item) => {
    const db = RPC(WORKER_URL)
    await db.relate(item)
  }, label)

  totalRels += result.success
  console.log(`  → Created: ${result.success}, Skipped: ${result.failed}`)
}

// =============================================================================
// Import phases
// =============================================================================

async function importPhase1_Entities(): Promise<{
  occUrls: Map<string, string>
  elemUrls: Map<string, string>
  taskUrls: Map<string, string>
  dwaUrls: Map<string, string>
  iwaUrls: Map<string, string>
  commUrls: Map<string, string>
}> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 1: ENTITIES')
  console.log('='.repeat(60))

  // Occupations
  const occRows = await parseFile(ONET_FILES.occupations)
  const occUrls = await importEntities('Occupation', occRows.map(r => ({
    id: r['O*NET-SOC Code']!,
    data: {
      code: r['O*NET-SOC Code'],
      title: r['Title'],
      description: r['Description']?.substring(0, 1000),
    },
  })), 'Occupations')

  // Content Model Elements
  const elemRows = await parseFile(ONET_FILES.contentModel)
  const elemUrls = await importEntities('Element', elemRows.map(r => ({
    id: r['Element ID']!,
    data: {
      elementId: r['Element ID'],
      name: r['Element Name'],
      description: r['Description']?.substring(0, 500),
    },
  })), 'Content Model Elements')

  // Tasks
  const taskRows = await parseFile(ONET_FILES.tasks)
  const taskUrls = await importEntities('Task', taskRows.map(r => ({
    id: `${r['O*NET-SOC Code']}-${r['Task ID']}`,
    data: {
      taskId: r['Task ID'],
      occCode: r['O*NET-SOC Code'],
      statement: r['Task']?.substring(0, 500),
      taskType: r['Task Type'],
    },
  })), 'Tasks')

  // DWAs
  const dwaRows = await parseFile(ONET_FILES.dwas)
  const dwaUrls = await importEntities('DWA', dwaRows.map(r => ({
    id: r['DWA ID']!,
    data: { dwaId: r['DWA ID'], title: r['DWA Title'], iwaId: r['IWA ID'] },
  })), 'DWAs')

  // IWAs
  const iwaRows = await parseFile(ONET_FILES.iwas)
  const iwaUrls = await importEntities('IWA', iwaRows.map(r => ({
    id: r['IWA ID']!,
    data: { iwaId: r['IWA ID'], title: r['IWA Title'], elementId: r['Element ID'] },
  })), 'IWAs')

  // UNSPSC - hierarchy
  const unspscRows = await parseFile(ONET_FILES.unspscReference)
  const segSet = new Map<string, string>()
  const famSet = new Map<string, { title: string; seg: string }>()
  const clsSet = new Map<string, { title: string; fam: string }>()

  for (const r of unspscRows) {
    const code = r['Commodity Code']!.padStart(8, '0')
    const seg = code.substring(0, 2) + '000000'
    const fam = code.substring(0, 4) + '0000'
    const cls = code.substring(0, 6) + '00'
    if (!segSet.has(seg)) segSet.set(seg, r['Segment Title'] || '')
    if (!famSet.has(fam)) famSet.set(fam, { title: r['Family Title'] || '', seg })
    if (!clsSet.has(cls)) clsSet.set(cls, { title: r['Class Title'] || '', fam })
  }

  await importEntities('UNSPSCSegment', [...segSet].map(([code, title]) => ({
    id: code, data: { code, title },
  })), 'UNSPSC Segments')

  await importEntities('UNSPSCFamily', [...famSet].map(([code, d]) => ({
    id: code, data: { code, title: d.title, segmentCode: d.seg },
  })), 'UNSPSC Families')

  await importEntities('UNSPSCClass', [...clsSet].map(([code, d]) => ({
    id: code, data: { code, title: d.title, familyCode: d.fam },
  })), 'UNSPSC Classes')

  const commUrls = await importEntities('UNSPSCCommodity', unspscRows.map(r => {
    const code = r['Commodity Code']!.padStart(8, '0')
    return {
      id: code,
      data: { code, title: r['Commodity Title'], classCode: code.substring(0, 6) + '00' },
    }
  }), 'UNSPSC Commodities')

  // Alternate Titles
  const altRows = await parseFile(ONET_FILES.alternateTitles)
  await importEntities('AlternateTitle', altRows.map(r => ({
    id: `${r['O*NET-SOC Code']}-${r['Alternate Title']?.substring(0, 40)}`.replace(/[^a-zA-Z0-9.-]/g, '_'),
    data: {
      occCode: r['O*NET-SOC Code'],
      title: r['Alternate Title'],
      shortTitle: r['Short Title'],
    },
  })), 'Alternate Titles')

  return { occUrls, elemUrls, taskUrls, dwaUrls, iwaUrls, commUrls }
}

async function importPhase2_WeightedEdges(
  occUrls: Map<string, string>,
  elemUrls: Map<string, string>,
): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 2: WEIGHTED ATTRIBUTE EDGES')
  console.log('='.repeat(60))

  const edgeFiles: { file: string; pred: string; rev: string; label: string }[] = [
    { file: ONET_FILES.skills, pred: 'hasSkill', rev: 'skillOf', label: 'Skills' },
    { file: ONET_FILES.abilities, pred: 'hasAbility', rev: 'abilityOf', label: 'Abilities' },
    { file: ONET_FILES.knowledge, pred: 'hasKnowledge', rev: 'knowledgeOf', label: 'Knowledge' },
    { file: ONET_FILES.workActivities, pred: 'hasWorkActivity', rev: 'workActivityOf', label: 'Work Activities' },
    { file: ONET_FILES.workContext, pred: 'hasWorkContext', rev: 'workContextOf', label: 'Work Context' },
    { file: ONET_FILES.workStyles, pred: 'hasWorkStyle', rev: 'workStyleOf', label: 'Work Styles' },
    { file: ONET_FILES.interests, pred: 'hasInterest', rev: 'interestOf', label: 'Interests' },
    { file: ONET_FILES.workValues, pred: 'hasWorkValue', rev: 'workValueOf', label: 'Work Values' },
  ]

  for (const { file, pred, rev, label } of edgeFiles) {
    const rows = await parseFile(file)
    if (rows.length === 0) { console.log(`  Skipping ${label} (no data)`); continue }

    // Group by occupation + element to merge scale ratings
    const grouped = new Map<string, Row[]>()
    for (const r of rows) {
      const key = `${r['O*NET-SOC Code']}:${r['Element ID']}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }

    const items = [...grouped].map(([key, ratingRows]) => {
      const [occCode, elemId] = key.split(':')
      const from = occUrls.get(occCode!) || makeUrl('Occupation', occCode!)
      const to = elemUrls.get(elemId!) || makeUrl('Element', elemId!)

      const data: Record<string, unknown> = {}
      for (const r of ratingRows) {
        const scale = r['Scale ID']
        const rating = {
          value: parseFloat(r['Data Value'] || '0'),
          n: r['N'] ? parseInt(r['N']) : undefined,
          stdError: r['Standard Error'] ? parseFloat(r['Standard Error']) : undefined,
        }
        if (scale === 'IM') data.importance = rating
        else if (scale === 'LV') data.level = rating
        else data[scale!.toLowerCase()] = rating
      }

      return { predicate: pred, reverse: rev, from, to, data }
    })

    await importRelationships(items, `${label} (${rows.length} ratings → ${items.length} edges)`)
  }
}

async function importPhase3_ToolsTech(
  occUrls: Map<string, string>,
  commUrls: Map<string, string>,
): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 3: TOOLS & TECHNOLOGY → UNSPSC')
  console.log('='.repeat(60))

  const toolRows = await parseFile(ONET_FILES.toolsUsed)
  const techRows = await parseFile(ONET_FILES.technologySkills)

  // Build tech metadata
  const techMeta = new Map<string, { hot: boolean; demand: boolean }>()
  for (const r of techRows) {
    techMeta.set(`${r['O*NET-SOC Code']}:${r['Commodity Code']}`, {
      hot: r['Hot Technology'] === 'Y',
      demand: r['In Demand'] === 'Y',
    })
  }

  const toolItems = toolRows.map(r => {
    const occCode = r['O*NET-SOC Code']!
    const commCode = r['Commodity Code']!.padStart(8, '0')
    const from = occUrls.get(occCode) || makeUrl('Occupation', occCode)
    const to = commUrls.get(commCode) || makeUrl('UNSPSCCommodity', commCode)
    const meta = techMeta.get(`${occCode}:${r['Commodity Code']}`)

    return {
      predicate: 'usesTool',
      reverse: 'usedBy',
      from,
      to,
      data: {
        commodityTitle: r['Commodity Title'],
        hotTechnology: meta?.hot ?? false,
        inDemand: meta?.demand ?? false,
      },
    }
  })

  await importRelationships(toolItems, `Tools Used (${toolRows.length} edges)`)
}

async function importPhase4_CrossLinks(
  occUrls: Map<string, string>,
  taskUrls: Map<string, string>,
  dwaUrls: Map<string, string>,
): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 4: CROSS-LINKS')
  console.log('='.repeat(60))

  // Related occupations
  const relRows = await parseFile(ONET_FILES.relatedOccupations)
  await importRelationships(relRows.map(r => ({
    predicate: 'relatedTo',
    reverse: 'relatedTo',
    from: occUrls.get(r['O*NET-SOC Code']!) || makeUrl('Occupation', r['O*NET-SOC Code']!),
    to: occUrls.get(r['Related O*NET-SOC Code']!) || makeUrl('Occupation', r['Related O*NET-SOC Code']!),
  })), `Related Occupations (${relRows.length})`)

  // Tasks to DWAs
  const t2dRows = await parseFile(ONET_FILES.tasksToDWAs)
  await importRelationships(t2dRows.map(r => {
    const taskId = `${r['O*NET-SOC Code']}-${r['Task ID']}`
    return {
      predicate: 'implementedBy',
      reverse: 'implements',
      from: taskUrls.get(taskId) || makeUrl('Task', taskId),
      to: dwaUrls.get(r['DWA ID']!) || makeUrl('DWA', r['DWA ID']!),
    }
  }), `Tasks → DWAs (${t2dRows.length})`)

  // UNSPSC hierarchy edges
  const unspscRows = await parseFile(ONET_FILES.unspscReference)
  const hierEdges: { predicate: string; reverse: string; from: string; to: string }[] = []

  const seenFam = new Set<string>()
  const seenCls = new Set<string>()

  for (const r of unspscRows) {
    const code = r['Commodity Code']!.padStart(8, '0')
    const seg = code.substring(0, 2) + '000000'
    const fam = code.substring(0, 4) + '0000'
    const cls = code.substring(0, 6) + '00'

    if (!seenFam.has(fam)) {
      seenFam.add(fam)
      hierEdges.push({
        predicate: 'inSegment', reverse: 'hasFamily',
        from: makeUrl('UNSPSCFamily', fam), to: makeUrl('UNSPSCSegment', seg),
      })
    }
    if (!seenCls.has(cls)) {
      seenCls.add(cls)
      hierEdges.push({
        predicate: 'inFamily', reverse: 'hasClass',
        from: makeUrl('UNSPSCClass', cls), to: makeUrl('UNSPSCFamily', fam),
      })
    }
    hierEdges.push({
      predicate: 'inClass', reverse: 'hasCommodity',
      from: makeUrl('UNSPSCCommodity', code), to: makeUrl('UNSPSCClass', cls),
    })
  }

  await importRelationships(hierEdges, `UNSPSC Hierarchy (${hierEdges.length})`)
}

// =============================================================================
// Import all
// =============================================================================

async function importAll(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('FULL O*NET IMPORT')
  console.log(`Concurrency: ${CONCURRENCY}`)
  console.log(`Target: ${WORKER_URL}`)
  console.log('='.repeat(60))

  await getBaseUrl()
  console.log(`Base URL: ${baseUrl}`)

  const startTime = Date.now()

  const { occUrls, elemUrls, taskUrls, dwaUrls, iwaUrls, commUrls } = await importPhase1_Entities()
  await importPhase2_WeightedEdges(occUrls, elemUrls)
  await importPhase3_ToolsTech(occUrls, commUrls)
  await importPhase4_CrossLinks(occUrls, taskUrls, dwaUrls)

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  const totalOps = totalThings + totalRels

  console.log('\n' + '='.repeat(60))
  console.log('IMPORT COMPLETE')
  console.log('='.repeat(60))
  console.log(`  Things:        ${totalThings}`)
  console.log(`  Relationships: ${totalRels}`)
  console.log(`  Total ops:     ${totalOps}`)
  console.log(`  Time:          ${elapsed} minutes`)
  console.log(`  Avg rate:      ${(totalOps / ((Date.now() - startTime) / 1000)).toFixed(0)} ops/sec`)
}

// =============================================================================
// Stats & Benchmark
// =============================================================================

async function showStats(): Promise<void> {
  console.log('\n📊 Database Statistics')
  const db = RPC(WORKER_URL)
  const stats = await db.stats()
  console.log(`  Things: ${stats.things}`)
  console.log(`  Relationships: ${stats.relationships}`)
  if (stats.dbSize) console.log(`  Database size: ${(stats.dbSize / 1024 / 1024).toFixed(1)} MB`)
  console.log('\n  By type:')
  for (const t of stats.types) {
    console.log(`    ${t.type.padEnd(20)} ${t.count}`)
  }
}

async function runBenchmark(): Promise<void> {
  console.log('\n📈 Benchmark with full O*NET data')
  console.log('='.repeat(60))

  // Ping
  const pings: number[] = []
  for (let i = 0; i < 5; i++) { const db = RPC(WORKER_URL); await db.ping() } // warmup
  for (let i = 0; i < 30; i++) {
    const db = RPC(WORKER_URL)
    const s = performance.now()
    await db.ping()
    pings.push(performance.now() - s)
  }
  const pingP50 = [...pings].sort((a, b) => a - b)[15]!
  console.log(`\n  Ping P50: ${pingP50.toFixed(1)}ms`)

  async function measure(name: string, iters: number, fn: () => Promise<unknown>): Promise<void> {
    for (let i = 0; i < 3; i++) await fn()
    const times: number[] = []
    for (let i = 0; i < iters; i++) {
      const s = performance.now()
      await fn()
      times.push(performance.now() - s)
    }
    const sorted = [...times].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(times.length * 0.5)]!
    const adj = Math.max(0, p50 - pingP50)
    console.log(`  ${name.padEnd(40)} raw=${p50.toFixed(1)}ms  adj=${adj.toFixed(1)}ms`)
  }

  // Get occupation list
  const db1 = RPC(WORKER_URL)
  const occs = await db1.list({ type: 'Occupation', limit: 10 })
  if (occs.length === 0) { console.log('  No data - run --import first'); return }

  const testOcc = occs[0]!

  console.log(`\n  Test occupation: ${testOcc.data.title} (${testOcc.data.code})`)
  console.log()

  await measure('Get occupation', 30, async () => {
    const db = RPC(WORKER_URL); return db.get(testOcc.url)
  })

  await measure('List occupations (limit 100)', 20, async () => {
    const db = RPC(WORKER_URL); return db.list({ type: 'Occupation', limit: 100 })
  })

  await measure('List ALL occupations (limit 2000)', 10, async () => {
    const db = RPC(WORKER_URL); return db.list({ type: 'Occupation', limit: 2000 })
  })

  await measure('Get skills (hasSkill edges)', 20, async () => {
    const db = RPC(WORKER_URL); return db.relationships(testOcc.url, { predicate: 'hasSkill' })
  })

  await measure('Get abilities (hasAbility edges)', 20, async () => {
    const db = RPC(WORKER_URL); return db.relationships(testOcc.url, { predicate: 'hasAbility' })
  })

  await measure('Get ALL relationships for occupation', 20, async () => {
    const db = RPC(WORKER_URL); return db.relationships(testOcc.url)
  })

  // Reverse lookups
  const db2 = RPC(WORKER_URL)
  const skills = await db2.list({ type: 'Element', limit: 1 })
  if (skills.length > 0) {
    await measure('Reverse: occupations with skill (skillOf)', 20, async () => {
      const db = RPC(WORKER_URL); return db.relatedBy(skills[0]!.url, 'hasSkill')
    })
  }

  // Tools
  const db3 = RPC(WORKER_URL)
  const toolEdges = await db3.relationships(testOcc.url, { predicate: 'usesTool' })
  console.log(`  (Occupation has ${toolEdges.length} tool edges)`)

  await measure('Get tools (usesTool edges)', 20, async () => {
    const db = RPC(WORKER_URL); return db.relationships(testOcc.url, { predicate: 'usesTool' })
  })

  // Graph traversal: occupation -> skills -> other occupations
  await measure('2-hop: occ → skill → other occs', 15, async () => {
    const db1 = RPC(WORKER_URL)
    const rels = await db1.relationships(testOcc.url, { predicate: 'hasSkill' })
    if (rels.length > 0) {
      const db2 = RPC(WORKER_URL)
      await db2.relatedBy(rels[0]!.to, 'hasSkill')
    }
  })

  // Related occupations
  await measure('Related occupations (relatedTo)', 20, async () => {
    const db = RPC(WORKER_URL); return db.relationships(testOcc.url, { predicate: 'relatedTo' })
  })

  // Stats query
  await measure('Stats query (full scan)', 5, async () => {
    const db = RPC(WORKER_URL); return db.stats()
  })
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  if (DO_DOWNLOAD) await downloadAll()
  if (DO_IMPORT) await importAll()
  if (DO_STATS) await showStats()
  if (DO_BENCH) await runBenchmark()

  if (!DO_DOWNLOAD && !DO_IMPORT && !DO_STATS && !DO_BENCH) {
    console.log(`
O*NET Full Import & Benchmark
==============================
Usage:
  npx tsx test/onet-full-import.ts [url] --download           Download O*NET files
  npx tsx test/onet-full-import.ts [url] --import             Import everything
  npx tsx test/onet-full-import.ts [url] --import -c 20       Import with concurrency 20
  npx tsx test/onet-full-import.ts [url] --stats              Database stats
  npx tsx test/onet-full-import.ts [url] --benchmark          Benchmark queries

Default concurrency: ${CONCURRENCY}
Default URL: ${WORKER_URL}
`)
  }
}

main().catch(console.error)
