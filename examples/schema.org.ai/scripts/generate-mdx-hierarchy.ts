#!/usr/bin/env tsx
/**
 * Generate MDX hierarchy from Schema.org data
 * Reads from platform/ai/packages/schema.org.ai/src/generated/data.ts
 * Outputs to things/
 */

import fs from 'fs/promises'
import path from 'path'

interface TypeMetadata {
  name: string
  description: string
  $type: string
  $id: string
  subClassOf?: string[]
}

// Import all type metadata from platform
async function loadSchemaData(): Promise<Map<string, TypeMetadata>> {
  const dataPath = path.join(__dirname, '../../platform/ai/packages/schema.org.ai/src/generated/data.ts')
  const content = await fs.readFile(dataPath, 'utf-8')

  const types = new Map<string, TypeMetadata>()

  // Parse export statements
  const exportRegex = /export const (\w+): TypeMetadata = ({[\s\S]*?})\n/g
  let match

  while ((match = exportRegex.exec(content)) !== null) {
    const varName = match[1]
    const objStr = match[2]

    // Extract metadata using regex
    const nameMatch = objStr.match(/name: '([^']+)'/)
    const descMatch = objStr.match(/description:\s*'([^']+)'/) || objStr.match(/description:\s*`([^`]+)`/)
    const typeMatch = objStr.match(/\$type: '([^']+)'/)
    const idMatch = objStr.match(/\$id: '([^']+)'/)
    const subClassMatch = objStr.match(/subClassOf: \[(.*?)\]/)

    if (!nameMatch || !descMatch || !typeMatch || !idMatch) continue

    const subClassOf: string[] = []
    if (subClassMatch) {
      const subClassStr = subClassMatch[1]
      const matches = subClassStr.matchAll(/'([^']+)'/g)
      for (const m of matches) {
        subClassOf.push(m[1])
      }
    }

    types.set(nameMatch[1], {
      name: nameMatch[1],
      description: descMatch[1].replace(/\\n/g, '\n'),
      $type: typeMatch[1],
      $id: idMatch[1],
      subClassOf: subClassOf.length > 0 ? subClassOf : undefined
    })
  }

  return types
}

// Build hierarchy tree
interface HierarchyNode {
  type: TypeMetadata
  children: HierarchyNode[]
  path: string[]
}

function buildHierarchy(types: Map<string, TypeMetadata>): Map<string, HierarchyNode> {
  const nodes = new Map<string, HierarchyNode>()

  // Create all nodes
  for (const [name, type] of types) {
    nodes.set(name, {
      type,
      children: [],
      path: []
    })
  }

  // Build parent-child relationships
  for (const [name, node] of nodes) {
    const parents = node.type.subClassOf || []
    for (const parentName of parents) {
      const parent = nodes.get(parentName)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // Build paths
  function buildPath(node: HierarchyNode, path: string[] = []): void {
    node.path = path
    for (const child of node.children) {
      buildPath(child, [...path, node.type.name])
    }
  }

  const thing = nodes.get('Thing')
  if (thing) {
    buildPath(thing)
  }

  return nodes
}

// Generate MDX content
function generateMDX(node: HierarchyNode, hierarchy: Map<string, HierarchyNode>): string {
  const { type } = node
  const hasChildren = node.children.length > 0

  // Build subclasses list
  const directSubclasses = node.children
    .map(child => `- **[${child.type.name}](${child.type.name}.mdx)**: ${child.type.description.split('.')[0]}`)
    .join('\n')

  // Build parent breadcrumb
  const parentLinks = node.path.length > 0
    ? node.path.map(p => `[${p}](${p}.mdx)`).join(' > ') + ` > **${type.name}**`
    : `**${type.name}**`

  return `---
$id: ${type.$id}
$context: https://schema.org
$type: ${type.$type}
name: ${type.name}
description: ${type.description.split('\n')[0]}
subClassOf: ${JSON.stringify(type.subClassOf || [])}
---

# ${type.name}

${type.description}

## Type Hierarchy

${parentLinks}

${hasChildren ? `## Direct Subclasses\n\n${directSubclasses}` : ''}

## Properties

See [Schema.org ${type.name} properties](https://schema.org/${type.name}#properties)

## Usage in Business-as-Code

\`\`\`typescript
import { $ } from 'sdk.do'
import type { ${type.name} } from 'schema.org.ai'

// Create a ${type.name}
const item: ${type.name} = {
  $type: '${type.name}',
  name: 'Example ${type.name}'
}

// Use semantic patterns
await $.${type.name}.create(item)
const result = await $.${type.name}.get('item-id')
\`\`\`

## Resources

- [Schema.org ${type.name}](https://schema.org/${type.name})
- [${type.name} Properties](https://schema.org/${type.name}#properties)

## License

This documentation is based on Schema.org vocabulary, which is licensed under Creative Commons Attribution-ShareAlike License (version 3.0).
`
}

// Generate directory structure and files
async function generateFiles(hierarchy: Map<string, HierarchyNode>, outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true })

  let count = 0
  for (const [name, node] of hierarchy) {
    const mdx = generateMDX(node, hierarchy)
    const filePath = path.join(outputDir, `${name}.mdx`)
    await fs.writeFile(filePath, mdx, 'utf-8')
    count++

    if (count % 100 === 0) {
      console.log(`Generated ${count} files...`)
    }
  }

  console.log(`✅ Generated ${count} MDX files in ${outputDir}`)
}

// Main execution
async function main() {
  console.log('Loading Schema.org data from platform...')
  const types = await loadSchemaData()
  console.log(`Loaded ${types.size} types`)

  console.log('Building hierarchy...')
  const hierarchy = buildHierarchy(types)

  const outputDir = path.join(__dirname, '../things')
  console.log(`Generating MDX files to ${outputDir}...`)
  await generateFiles(hierarchy, outputDir)

  console.log('✅ Done!')
}

main().catch(console.error)
