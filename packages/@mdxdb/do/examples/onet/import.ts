/**
 * O*NET + UNSPSC Import Script for mdxdb
 *
 * Downloads and imports the O*NET database with full UNSPSC integration.
 * Creates a connected graph where occupations link to UNSPSC commodities
 * via tools and technology skills.
 *
 * Usage:
 *   npx tsx examples/onet/import.ts --download  # Download O*NET files
 *   npx tsx examples/onet/import.ts --import    # Import to mdxdb
 *   npx tsx examples/onet/import.ts --all       # Both
 */

import { URL_PATTERNS, PREDICATES, ONET_FILES } from './schema.js'

const ONET_VERSION = '29.0' // Update as needed
const ONET_BASE_URL = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION.replace('.', '_')}_excel`
const DATA_DIR = './data/onet'

// =============================================================================
// Download Functions
// =============================================================================

async function downloadONET() {
  const fs = await import('fs/promises')
  const path = await import('path')

  await fs.mkdir(DATA_DIR, { recursive: true })

  console.log(`Downloading O*NET ${ONET_VERSION} database...`)

  for (const [key, filename] of Object.entries(ONET_FILES)) {
    const url = `${ONET_BASE_URL}/${encodeURIComponent(filename)}`
    const filepath = path.join(DATA_DIR, filename)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`  Skipping ${filename}: ${response.status}`)
        continue
      }
      const buffer = await response.arrayBuffer()
      await fs.writeFile(filepath, Buffer.from(buffer))
      console.log(`  Downloaded: ${filename}`)
    } catch (error) {
      console.warn(`  Failed: ${filename}`, error)
    }
  }

  console.log('Download complete!')
}

// =============================================================================
// Parse Functions
// =============================================================================

interface ParsedRow {
  [key: string]: string | number | null
}

async function parseExcel(filepath: string): Promise<ParsedRow[]> {
  // Dynamic import xlsx for parsing
  const XLSX = await import('xlsx')
  const workbook = XLSX.readFile(filepath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName!]
  return XLSX.utils.sheet_to_json(sheet) as ParsedRow[]
}

// =============================================================================
// Import Functions
// =============================================================================

interface MDXDBClient {
  create(options: { type: string; id?: string; data: Record<string, unknown> }): Promise<{ url: string }>
  relate(options: {
    predicate: string
    reverse?: string
    from: string
    to: string
    data?: Record<string, unknown>
  }): Promise<unknown>
}

async function importOccupations(db: MDXDBClient, rows: ParsedRow[]) {
  console.log(`Importing ${rows.length} occupations...`)

  for (const row of rows) {
    const code = String(row['O*NET-SOC Code'] || row['Code'])
    await db.create({
      type: 'Occupation',
      id: code,
      data: {
        code,
        title: row['Title'],
        description: row['Description'],
      },
    })
  }
}

async function importContentModel(db: MDXDBClient, rows: ParsedRow[]) {
  console.log(`Importing ${rows.length} content model elements...`)

  for (const row of rows) {
    const elementId = String(row['Element ID'])
    await db.create({
      type: 'ContentElement',
      id: elementId,
      data: {
        elementId,
        name: row['Element Name'],
        description: row['Description'],
      },
    })
  }
}

async function importUNSPSC(db: MDXDBClient, rows: ParsedRow[]) {
  console.log(`Importing UNSPSC hierarchy from ${rows.length} commodities...`)

  // Extract unique segments, families, classes
  const segments = new Map<string, { code: string; title: string }>()
  const families = new Map<string, { code: string; title: string; segmentCode: string }>()
  const classes = new Map<string, { code: string; title: string; familyCode: string }>()

  for (const row of rows) {
    const commodityCode = String(row['Commodity Code']).padStart(8, '0')
    const segmentCode = commodityCode.substring(0, 2) + '000000'
    const familyCode = commodityCode.substring(0, 4) + '0000'
    const classCode = commodityCode.substring(0, 6) + '00'

    if (!segments.has(segmentCode)) {
      segments.set(segmentCode, {
        code: segmentCode,
        title: String(row['Segment Title'] || ''),
      })
    }

    if (!families.has(familyCode)) {
      families.set(familyCode, {
        code: familyCode,
        title: String(row['Family Title'] || ''),
        segmentCode,
      })
    }

    if (!classes.has(classCode)) {
      classes.set(classCode, {
        code: classCode,
        title: String(row['Class Title'] || ''),
        familyCode,
      })
    }
  }

  // Import segments
  for (const segment of segments.values()) {
    await db.create({
      type: 'UNSPSCSegment',
      id: segment.code,
      data: segment,
    })
  }

  // Import families with edges to segments
  for (const family of families.values()) {
    await db.create({
      type: 'UNSPSCFamily',
      id: family.code,
      data: family,
    })
    await db.relate({
      predicate: PREDICATES.inSegment.reverse,
      reverse: 'inSegment',
      from: URL_PATTERNS.unspscSegment(family.segmentCode),
      to: URL_PATTERNS.unspscFamily(family.code),
    })
  }

  // Import classes with edges to families
  for (const cls of classes.values()) {
    await db.create({
      type: 'UNSPSCClass',
      id: cls.code,
      data: cls,
    })
    await db.relate({
      predicate: PREDICATES.inFamily.reverse,
      reverse: 'inFamily',
      from: URL_PATTERNS.unspscFamily(cls.familyCode),
      to: URL_PATTERNS.unspscClass(cls.code),
    })
  }

  // Import commodities with edges to classes
  for (const row of rows) {
    const commodityCode = String(row['Commodity Code']).padStart(8, '0')
    const classCode = commodityCode.substring(0, 6) + '00'

    await db.create({
      type: 'UNSPSCCommodity',
      id: commodityCode,
      data: {
        code: commodityCode,
        title: row['Commodity Title'],
        classCode,
      },
    })
    await db.relate({
      predicate: PREDICATES.inClass.reverse,
      reverse: 'inClass',
      from: URL_PATTERNS.unspscClass(classCode),
      to: URL_PATTERNS.unspscCommodity(commodityCode),
    })
  }
}

async function importWeightedEdges(
  db: MDXDBClient,
  rows: ParsedRow[],
  predicate: string,
  reverse: string
) {
  console.log(`Importing ${rows.length} weighted edges (${predicate})...`)

  // Group by occupation + element to combine importance/level ratings
  const grouped = new Map<string, ParsedRow[]>()

  for (const row of rows) {
    const key = `${row['O*NET-SOC Code']}:${row['Element ID']}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(row)
  }

  for (const [key, ratingRows] of grouped) {
    const [occCode, elementId] = key.split(':')
    const data: Record<string, unknown> = {}

    for (const row of ratingRows) {
      const scale = row['Scale ID'] as string
      const rating = {
        scale,
        value: Number(row['Data Value']),
        n: row['N'] ? Number(row['N']) : undefined,
        stdError: row['Standard Error'] ? Number(row['Standard Error']) : undefined,
        lowerCI: row['Lower CI Bound'] ? Number(row['Lower CI Bound']) : undefined,
        upperCI: row['Upper CI Bound'] ? Number(row['Upper CI Bound']) : undefined,
        suppress: row['Recommend Suppress'] === 'Y',
        notRelevant: row['Not Relevant'] === 'Y',
        date: row['Date'] as string,
        source: row['Domain Source'] as string,
      }

      if (scale === 'IM') data.importance = rating
      else if (scale === 'LV') data.level = rating
      else data[scale.toLowerCase()] = rating
    }

    await db.relate({
      predicate,
      reverse,
      from: URL_PATTERNS.occupation(occCode!),
      to: URL_PATTERNS.element(elementId!),
      data,
    })
  }
}

async function importToolsAndTech(db: MDXDBClient, toolsRows: ParsedRow[], techRows: ParsedRow[]) {
  console.log(`Importing ${toolsRows.length} tool edges and ${techRows.length} tech edges...`)

  // Build tech metadata map (hot/in-demand flags)
  const techMeta = new Map<string, { hotTechnology: boolean; inDemand: boolean }>()
  for (const row of techRows) {
    const key = `${row['O*NET-SOC Code']}:${row['Commodity Code']}`
    techMeta.set(key, {
      hotTechnology: row['Hot Technology'] === 'Y',
      inDemand: row['In Demand'] === 'Y',
    })
  }

  // Import tool edges with UNSPSC link
  for (const row of toolsRows) {
    const occCode = String(row['O*NET-SOC Code'])
    const commodityCode = String(row['Commodity Code']).padStart(8, '0')
    const key = `${occCode}:${row['Commodity Code']}`
    const meta = techMeta.get(key)

    // Edge from Occupation to UNSPSC Commodity
    await db.relate({
      predicate: 'usesTool',
      reverse: 'usedBy',
      from: URL_PATTERNS.occupation(occCode),
      to: URL_PATTERNS.unspscCommodity(commodityCode),
      data: {
        commodityCode,
        commodityTitle: row['Commodity Title'],
        hotTechnology: meta?.hotTechnology ?? false,
        inDemand: meta?.inDemand ?? false,
      },
    })
  }
}

async function importRelatedOccupations(db: MDXDBClient, rows: ParsedRow[]) {
  console.log(`Importing ${rows.length} related occupation edges...`)

  for (const row of rows) {
    const fromCode = String(row['O*NET-SOC Code'])
    const toCode = String(row['Related O*NET-SOC Code'])

    await db.relate({
      predicate: 'relatedTo',
      reverse: 'relatedTo', // symmetric
      from: URL_PATTERNS.occupation(fromCode),
      to: URL_PATTERNS.occupation(toCode),
      data: {
        // Add any available relatedness metrics
      },
    })
  }
}

// =============================================================================
// Main Import Pipeline
// =============================================================================

async function importAll(db: MDXDBClient) {
  const path = await import('path')

  console.log('Starting O*NET + UNSPSC import...\n')

  // Phase 1: UNSPSC Hierarchy (needed before tools/tech)
  console.log('=== Phase 1: UNSPSC Hierarchy ===')
  const unspscRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.unspscReference))
  await importUNSPSC(db, unspscRows)

  // Phase 2: O*NET Entities
  console.log('\n=== Phase 2: O*NET Entities ===')
  const occupationRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.occupations))
  await importOccupations(db, occupationRows)

  const contentModelRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.contentModel))
  await importContentModel(db, contentModelRows)

  // Phase 3: Weighted Attribute Edges
  console.log('\n=== Phase 3: Attribute Edges ===')

  const skillsRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.skills))
  await importWeightedEdges(db, skillsRows, 'hasSkill', 'skillOf')

  const abilitiesRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.abilities))
  await importWeightedEdges(db, abilitiesRows, 'hasAbility', 'abilityOf')

  const knowledgeRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.knowledge))
  await importWeightedEdges(db, knowledgeRows, 'hasKnowledge', 'knowledgeOf')

  const workActivitiesRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.workActivities))
  await importWeightedEdges(db, workActivitiesRows, 'hasWorkActivity', 'workActivityOf')

  // Phase 4: Tools & Tech (UNSPSC Bridge)
  console.log('\n=== Phase 4: Tools & Technology (UNSPSC Link) ===')
  const toolsRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.toolsUsed))
  const techRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.technologySkills))
  await importToolsAndTech(db, toolsRows, techRows)

  // Phase 5: Related Occupations
  console.log('\n=== Phase 5: Related Occupations ===')
  const relatedRows = await parseExcel(path.join(DATA_DIR, ONET_FILES.relatedOccupations))
  await importRelatedOccupations(db, relatedRows)

  console.log('\n=== Import Complete ===')
  console.log('Graph now contains:')
  console.log('- O*NET Occupations with Skills, Abilities, Knowledge edges')
  console.log('- UNSPSC Hierarchy (Segment → Family → Class → Commodity)')
  console.log('- Occupation → Tool → UNSPSC Commodity bridges')
  console.log('- Related Occupation cross-links')
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--download') || args.includes('--all')) {
    await downloadONET()
  }

  if (args.includes('--import') || args.includes('--all')) {
    // TODO: Connect to actual mdxdb client
    console.log('Import requires mdxdb client connection.')
    console.log('Example:')
    console.log('  const db = RPC("https://your-do.workers.dev")')
    console.log('  await importAll(db)')
  }

  if (!args.length) {
    console.log('Usage:')
    console.log('  npx tsx import.ts --download  Download O*NET files')
    console.log('  npx tsx import.ts --import    Import to mdxdb')
    console.log('  npx tsx import.ts --all       Both')
  }
}

main().catch(console.error)

export { downloadONET, importAll, parseExcel }
