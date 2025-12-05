#!/usr/bin/env npx tsx
/**
 * Schema.org.ai Seed Script
 *
 * Creates a superset vocabulary by merging schema.org with custom extensions.
 * Generates MDX files in a flat structure (things/ folder) with $source markers
 * to track which items can be regenerated vs preserved.
 *
 * Output structure:
 *   things/Thing.mdx
 *   things/Agent.mdx  (extension)
 *   things/Person.mdx
 *   properties/name.mdx
 *   properties/digital.mdx  (extension)
 *
 * Usage:
 *   npx tsx scripts/seed.ts              # Generate default types + all extensions
 *   npx tsx scripts/seed.ts --all        # Generate ALL schema.org types + extensions
 *   npx tsx scripts/seed.ts --extensions # Generate only extension types
 */

import { mkdir, writeFile, readFile, rm, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  toVocabulary,
  extendVocabulary,
  filterBySource,
  typeHierarchy,
  typeDescendants,
  typesForProperty,
  propertiesForType,
  type Vocabulary,
  type ExtendedVocabulary,
  type Thing,
  type RelationshipDef,
  type VocabularySource,
} from '@mdxld/jsonld'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_ORG_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld'
const EXTENSIONS_PATH = join(__dirname, '..', 'extensions.jsonld')
const OUTPUT_DIR = join(__dirname, '..')
const THINGS_DIR = join(OUTPUT_DIR, 'things')
const PROPERTIES_DIR = join(OUTPUT_DIR, 'properties')

/** Fetch and parse schema.org vocabulary */
async function fetchSchemaOrg(): Promise<Vocabulary> {
  console.log('Fetching schema.org vocabulary...')
  const response = await fetch(SCHEMA_ORG_URL)
  const json = await response.json()
  console.log(`Parsing vocabulary...`)
  const vocab = toVocabulary(json)
  console.log(`  Found ${vocab.things.size} types and ${vocab.relationships.size} properties`)
  return vocab
}

/** Load extensions from local file */
async function loadExtensions(): Promise<Vocabulary> {
  console.log('Loading extensions...')
  try {
    const content = await readFile(EXTENSIONS_PATH, 'utf-8')
    const json = JSON.parse(content)
    const vocab = toVocabulary(json)
    console.log(`  Found ${vocab.things.size} extension types and ${vocab.relationships.size} extension properties`)
    return vocab
  } catch (error) {
    console.log('  No extensions.jsonld found, using base vocabulary only')
    return {
      $context: 'https://schema.org.ai',
      things: new Map(),
      relationships: new Map(),
    }
  }
}

/** Generate MDX content for a Type */
function generateTypeMDX(vocab: ExtendedVocabulary, typeName: string): string {
  const thing = vocab.things.get(typeName)
  if (!thing) throw new Error(`Type not found: ${typeName}`)

  const hierarchy = typeHierarchy(vocab, typeName)
  const { direct, inherited } = propertiesForType(vocab, typeName)
  const source = thing.$source || 'base'

  // Get direct children (not all descendants)
  const directChildren = [...vocab.things.values()]
    .filter(t => t.subClassOf?.includes(typeName))
    .map(t => t.name)
    .sort()

  // Determine context based on source
  const context = source === 'extension' ? vocab.extensionContext : vocab.baseContext

  // Build frontmatter
  const lines = [
    '---',
    `$id: ${context}/${thing.name}`,
    `$context: ${context}`,
    `$type: Class`,
    `$source: ${source}`,
    `name: ${thing.name}`,
    `description: ${JSON.stringify(thing.description)}`,
  ]

  if (thing.subClassOf?.length) {
    lines.push(`subClassOf:`)
    for (const parent of thing.subClassOf) {
      lines.push(`  - ${parent}`)
    }
  }

  if (hierarchy.length > 0) {
    lines.push(`parents:`)
    for (const parent of hierarchy) {
      lines.push(`  - ${parent}`)
    }
  }

  if (directChildren.length > 0) {
    lines.push(`children:`)
    for (const child of directChildren) {
      lines.push(`  - ${child}`)
    }
  }

  lines.push('---')
  lines.push('')

  // Inheritance chain
  if (hierarchy.length > 0) {
    const chain = [typeName, ...hierarchy].reverse()
    const links = chain.map((t) => {
      if (t === typeName) return `**${t}**`
      return `[${t}](${t}.mdx)`
    })
    lines.push(links.join(' → '))
    lines.push('')
  }

  // Build content
  lines.push(`# ${thing.name}`)
  lines.push('')
  lines.push(thing.description)
  lines.push('')

  // Direct properties
  if (direct.length > 0) {
    lines.push('## Properties')
    lines.push('')
    lines.push('| Property | Expected Type | Description |')
    lines.push('|----------|---------------|-------------|')
    for (const prop of direct.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))) {
      const types = prop.to.map(t => `[${t}](${t}.mdx)`).join(', ') || 'Any'
      const desc = String(prop.description || '').split('\n')[0].slice(0, 100).replace(/\|/g, '\\|')
      const sourceMarker = prop.$source === 'extension' ? ' 🆕' : ''
      lines.push(`| [${prop.name}](../properties/${prop.name}.mdx)${sourceMarker} | ${types} | ${desc} |`)
    }
    lines.push('')
  }

  // Inherited properties by ancestor
  if (inherited.length > 0) {
    lines.push('## Inherited Properties')
    lines.push('')
    for (const { type, properties } of inherited) {
      lines.push(`### From [${type}](${type}.mdx)`)
      lines.push('')
      lines.push('| Property | Expected Type | Description |')
      lines.push('|----------|---------------|-------------|')
      for (const prop of properties.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))) {
        const types = prop.to.map(t => `[${t}](${t}.mdx)`).join(', ') || 'Any'
        const desc = String(prop.description || '').split('\n')[0].slice(0, 100).replace(/\|/g, '\\|')
        const sourceMarker = prop.$source === 'extension' ? ' 🆕' : ''
        lines.push(`| [${prop.name}](../properties/${prop.name}.mdx)${sourceMarker} | ${types} | ${desc} |`)
      }
      lines.push('')
    }
  }

  // Direct subtypes (children)
  if (directChildren.length > 0) {
    lines.push('## Subtypes')
    lines.push('')
    for (const child of directChildren) {
      const childThing = vocab.things.get(child)
      const sourceMarker = childThing?.$source === 'extension' ? ' 🆕' : ''
      lines.push(`- [${child}](${child}.mdx)${sourceMarker}`)
    }
    lines.push('')
  }

  // Usage example for extension types
  if (source === 'extension') {
    lines.push('## Usage')
    lines.push('')
    lines.push('```typescript')
    lines.push(`import { $ } from 'sdk.do'`)
    lines.push(`import type { ${thing.name} } from 'schema.org.ai'`)
    lines.push('')
    lines.push(`const item: ${thing.name} = {`)
    lines.push(`  $type: '${thing.name}',`)
    lines.push(`  name: 'Example ${thing.name}'`)
    lines.push(`}`)
    lines.push('')
    lines.push(`await $.${thing.name}.create(item)`)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

/** Generate MDX content for a Property */
function generatePropertyMDX(vocab: ExtendedVocabulary, propertyName: string): string {
  const rel = vocab.relationships.get(propertyName)
  if (!rel) throw new Error(`Property not found: ${propertyName}`)

  const allTypes = typesForProperty(vocab, propertyName)
  const source = rel.$source || 'base'
  const context = source === 'extension' ? vocab.extensionContext : vocab.baseContext

  // Build frontmatter
  const lines = [
    '---',
    `$id: ${context}/${rel.name}`,
    `$context: ${context}`,
    `$type: Property`,
    `$source: ${source}`,
    `name: ${rel.name}`,
    `description: ${JSON.stringify(rel.description)}`,
  ]

  if (rel.from.length > 0) {
    lines.push('domainIncludes:')
    for (const type of rel.from) {
      lines.push(`  - ${type}`)
    }
  }

  if (rel.to.length > 0) {
    lines.push('rangeIncludes:')
    for (const type of rel.to) {
      lines.push(`  - ${type}`)
    }
  }

  if (rel.subPropertyOf) {
    lines.push(`subPropertyOf: ${rel.subPropertyOf}`)
  }

  if (rel.inverseOf) {
    lines.push(`inverseOf: ${rel.inverseOf}`)
  }

  if (rel.supersededBy) {
    lines.push(`supersededBy: ${rel.supersededBy}`)
  }

  lines.push('---')
  lines.push('')

  // Build content
  lines.push(`# ${rel.name}`)
  lines.push('')
  lines.push(rel.description)
  lines.push('')

  // Domain types - link to things folder
  if (rel.from.length > 0) {
    lines.push('## Used On')
    lines.push('')
    lines.push('This property is used on the following types:')
    lines.push('')
    for (const type of rel.from.sort()) {
      const typeThing = vocab.things.get(type)
      const sourceMarker = typeThing?.$source === 'extension' ? ' 🆕' : ''
      lines.push(`- [${type}](../things/${type}.mdx)${sourceMarker}`)
    }
    lines.push('')
  }

  // All types including inherited
  if (allTypes.length > rel.from.length) {
    lines.push('## Inherited By')
    lines.push('')
    lines.push('This property is also available on these types through inheritance:')
    lines.push('')
    const inherited = allTypes.filter(t => !rel.from.includes(t)).sort()
    for (const type of inherited.slice(0, 50)) {
      const typeThing = vocab.things.get(type)
      const sourceMarker = typeThing?.$source === 'extension' ? ' 🆕' : ''
      lines.push(`- [${type}](../things/${type}.mdx)${sourceMarker}`)
    }
    if (inherited.length > 50) {
      lines.push(`- ... and ${inherited.length - 50} more`)
    }
    lines.push('')
  }

  // Expected types
  if (rel.to.length > 0) {
    lines.push('## Expected Types')
    lines.push('')
    lines.push('Values are expected to be one of:')
    lines.push('')
    for (const type of rel.to.sort()) {
      const typeThing = vocab.things.get(type)
      const sourceMarker = typeThing?.$source === 'extension' ? ' 🆕' : ''
      lines.push(`- [${type}](../things/${type}.mdx)${sourceMarker}`)
    }
    lines.push('')
  }

  // Related properties
  if (rel.inverseOf) {
    lines.push('## Inverse Property')
    lines.push('')
    lines.push(`- [${rel.inverseOf}](${rel.inverseOf}.mdx)`)
    lines.push('')
  }

  if (rel.subPropertyOf) {
    lines.push('## Parent Property')
    lines.push('')
    lines.push(`- [${rel.subPropertyOf}](${rel.subPropertyOf}.mdx)`)
    lines.push('')
  }

  return lines.join('\n')
}

/** Main seed function */
async function seed(options: { types?: string[]; all?: boolean; extensionsOnly?: boolean } = {}) {
  // Load vocabularies
  const base = await fetchSchemaOrg()
  const extensions = await loadExtensions()

  // Create extended vocabulary
  console.log('\nCreating extended vocabulary...')
  const vocab = extendVocabulary(base, extensions, {
    baseContext: 'https://schema.org',
    extensionContext: 'https://schema.org.ai',
    conflictStrategy: 'extension-wins',
  })

  const { things: extensionTypes, relationships: extensionProps } = filterBySource(vocab, 'extension')
  console.log(`  Extended vocabulary: ${vocab.things.size} types, ${vocab.relationships.size} properties`)
  console.log(`  Extensions: ${extensionTypes.length} types, ${extensionProps.length} properties`)

  // Determine which types to generate
  let typesToGenerate: string[]
  if (options.extensionsOnly) {
    // Only generate extension types
    typesToGenerate = extensionTypes.map(t => t.name)
  } else if (options.all) {
    // Generate ALL types
    typesToGenerate = [...vocab.things.keys()]
  } else if (options.types?.length) {
    // Generate specified types
    typesToGenerate = options.types
  } else {
    // Default: core schema.org types + ALL extensions
    const coreTypes = [
      'Thing', 'Action', 'CreativeWork', 'Event', 'Intangible',
      'Organization', 'Person', 'Place', 'Product',
      'Article', 'BlogPosting', 'WebPage', 'WebSite', 'WebAPI',
      'ImageObject', 'VideoObject', 'AudioObject',
      'Offer', 'Review', 'Rating',
      'PostalAddress', 'ContactPoint',
      'LocalBusiness', 'Restaurant', 'Hotel',
      'Book', 'Movie', 'MusicRecording',
      'Recipe', 'HowTo', 'FAQPage',
      'ItemList', 'BreadcrumbList',
      'SearchAction', 'ReadAction', 'WatchAction',
      'SoftwareApplication',
    ]
    // Add all extension types
    typesToGenerate = [...new Set([...coreTypes, ...extensionTypes.map(t => t.name)])]
  }

  // Create output directories
  await mkdir(THINGS_DIR, { recursive: true })
  await mkdir(PROPERTIES_DIR, { recursive: true })

  // Collect all properties used by these types
  const propertiesUsed = new Set<string>()

  // Generate type files
  console.log(`\nGenerating ${typesToGenerate.length} type files...`)
  for (const typeName of typesToGenerate) {
    if (!vocab.things.has(typeName)) {
      console.warn(`  ⚠ Warning: Type "${typeName}" not found in vocabulary`)
      continue
    }

    const thing = vocab.things.get(typeName)!
    const content = generateTypeMDX(vocab, typeName)
    const filePath = join(THINGS_DIR, `${typeName}.mdx`)

    await writeFile(filePath, content)
    const marker = thing.$source === 'extension' ? '🆕' : '✓'
    console.log(`  ${marker} things/${typeName}.mdx`)

    // Collect properties
    const { direct, inherited } = propertiesForType(vocab, typeName)
    direct.forEach(p => propertiesUsed.add(p.name))
    inherited.forEach(({ properties }) => properties.forEach(p => propertiesUsed.add(p.name)))
  }

  // Add all extension properties
  extensionProps.forEach(p => propertiesUsed.add(p.name))

  // Generate property files
  console.log(`\nGenerating ${propertiesUsed.size} property files...`)
  for (const propName of propertiesUsed) {
    if (!vocab.relationships.has(propName)) {
      console.warn(`  ⚠ Warning: Property "${propName}" not found in vocabulary`)
      continue
    }

    const rel = vocab.relationships.get(propName)!
    const content = generatePropertyMDX(vocab, propName)
    await writeFile(join(PROPERTIES_DIR, `${propName}.mdx`), content)
    const marker = rel.$source === 'extension' ? '🆕' : '✓'
    console.log(`  ${marker} properties/${propName}.mdx`)
  }

  console.log('\n✅ Done!')
  console.log(`Generated ${typesToGenerate.length} types and ${propertiesUsed.size} properties`)
  console.log(`  Base types: ${typesToGenerate.filter(t => vocab.things.get(t)?.$source === 'base').length}`)
  console.log(`  Extension types: ${typesToGenerate.filter(t => vocab.things.get(t)?.$source === 'extension').length}`)
}

// Parse CLI arguments
const args = process.argv.slice(2)
const options: { types?: string[]; all?: boolean; extensionsOnly?: boolean } = {}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--types' && args[i + 1]) {
    options.types = args[i + 1].split(',')
    i++
  } else if (args[i] === '--all') {
    options.all = true
  } else if (args[i] === '--extensions') {
    options.extensionsOnly = true
  }
}

seed(options).catch(console.error)
