/**
 * Generate Storybook stories from a site registry
 *
 * This script generates .stories.tsx files from a site registry.
 * Run with: npx @mdxui/storybook generate-stories
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export interface SiteEntry {
  id: string
  name: string
  domain: string
  description: string
  layout: string
  layoutPackage: string
  layoutComponent: string
  variants?: Array<{
    name: string
    description: string
    props: Record<string, unknown>
  }>
}

export interface GenerateOptions {
  /** Output directory for generated stories */
  outputDir: string
  /** Title prefix for stories (default: 'Sites') */
  titlePrefix?: string
  /** Package to import site registry from */
  registryPackage?: string
}

/**
 * Generate a single story file content for a site
 */
export function generateSiteStoryContent(site: SiteEntry, options: GenerateOptions): string {
  const { titlePrefix = 'Sites', registryPackage = '@mdxui/examples' } = options

  const layoutImport =
    site.layoutPackage === '@mdxui/shadcnblocks'
      ? `import { ${site.layoutComponent} } from '@mdxui/shadcnblocks/templates'`
      : `import { ${site.layoutComponent} } from '@mdxui/tailark/templates'`

  const siteComponentName = site.id.charAt(0).toUpperCase() + site.id.slice(1) + 'Site'
  const siteDataName = site.id + 'Data'

  let content = `/**
 * ${site.domain} - Auto-generated story
 * ${site.description}
 */

import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ${siteComponentName}, ${siteDataName} } from '${registryPackage}'
${layoutImport}

const meta: Meta<typeof ${site.layoutComponent}> = {
  title: '${titlePrefix}/${site.domain}',
  component: ${site.layoutComponent},
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '${site.name} - ${site.description}',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ${site.layoutComponent}>

export const Default: Story = {
  name: 'Default',
  render: () => <${siteComponentName} />,
  parameters: {
    docs: {
      description: {
        story: 'The full ${site.domain} landing page using ${site.layoutComponent}.',
      },
    },
  },
}
`

  // Add variant stories
  if (site.variants && site.variants.length > 0) {
    for (const variant of site.variants) {
      const propsString = Object.entries(variant.props)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}="${value}"`
          }
          return `${key}={${JSON.stringify(value)}}`
        })
        .join(' ')

      content += `
export const ${variant.name}: Story = {
  name: '${variant.name}',
  render: () => <${site.layoutComponent} {...${siteDataName}} ${propsString} />,
  parameters: {
    docs: {
      description: {
        story: '${variant.description}',
      },
    },
  },
}
`
    }
  }

  return content
}

/**
 * Generate all story files from a registry
 */
export function generateStoriesFromRegistry(registry: SiteEntry[], options: GenerateOptions): void {
  const { outputDir } = options

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true })

  // Generate a story file for each site
  for (const site of registry) {
    const content = generateSiteStoryContent(site, options)
    const filename = `${site.domain.replace(/\./g, '-')}.stories.tsx`
    const filepath = join(outputDir, filename)
    writeFileSync(filepath, content)
    console.log(`Generated: ${filepath}`)
  }

  // Generate an index file that re-exports all
  const indexContent = `/**
 * Auto-generated site stories index
 * Generated from @mdxui/examples site registry
 */

${registry.map((site) => `export * from './${site.domain.replace(/\./g, '-')}.stories'`).join('\n')}
`

  writeFileSync(join(outputDir, 'index.ts'), indexContent)
  console.log(`Generated: ${join(outputDir, 'index.ts')}`)
}

/**
 * Generate a combined stories file with all sites
 */
export function generateCombinedStoriesFile(registry: SiteEntry[], options: GenerateOptions): string {
  const { titlePrefix = 'Sites', registryPackage = '@mdxui/examples' } = options

  // Collect unique layout imports
  const layoutImports = new Map<string, Set<string>>()
  for (const site of registry) {
    if (!layoutImports.has(site.layoutPackage)) {
      layoutImports.set(site.layoutPackage, new Set())
    }
    layoutImports.get(site.layoutPackage)!.add(site.layoutComponent)
  }

  const layoutImportStatements = Array.from(layoutImports.entries())
    .map(([pkg, components]) => {
      const pkgPath = pkg === '@mdxui/shadcnblocks' ? '@mdxui/shadcnblocks/templates' : '@mdxui/tailark/templates'
      return `import { ${Array.from(components).join(', ')} } from '${pkgPath}'`
    })
    .join('\n')

  const siteImports = registry
    .map((site) => {
      const componentName = site.id.charAt(0).toUpperCase() + site.id.slice(1) + 'Site'
      const dataName = site.id + 'Data'
      return `  ${componentName},\n  ${dataName},`
    })
    .join('\n')

  let content = `/**
 * Auto-generated Site Stories
 *
 * This file is automatically generated from the @mdxui/examples site registry.
 * To regenerate: npx @mdxui/storybook generate-stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { siteRegistry } from '${registryPackage}'
import {
${siteImports}
} from '${registryPackage}'
${layoutImportStatements}

const SiteRenderer: React.FC<{ siteId?: string }> = ({ siteId }) => {
  const sites: Record<string, React.FC> = {
${registry.map((site) => `    ${site.id}: ${site.id.charAt(0).toUpperCase() + site.id.slice(1)}Site,`).join('\n')}
  }
  const Site = siteId ? sites[siteId] : null
  if (!Site) return <div>Select a site</div>
  return <Site />
}

const meta: Meta<typeof SiteRenderer> = {
  title: '${titlePrefix}',
  component: SiteRenderer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: \`Auto-generated site stories from ${registryPackage}.\\n\\nThis includes \${siteRegistry.length} real domain landing pages using various @mdxui layouts.\`,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SiteRenderer>

`

  // Generate stories for each site
  for (const site of registry) {
    const storyName = site.id.charAt(0).toUpperCase() + site.id.slice(1)
    const componentName = storyName + 'Site'

    content += `/** ${site.domain} - ${site.description} */
export const ${storyName}: Story = {
  name: '${site.domain}',
  render: () => <${componentName} />,
  parameters: {
    docs: {
      description: {
        story: '${site.description} Uses ${site.layoutComponent}.',
      },
    },
  },
}

`

    // Add variants
    if (site.variants) {
      for (const variant of site.variants) {
        const variantStoryName = storyName + variant.name
        const propsString = Object.entries(variant.props)
          .map(([key, value]) => {
            if (typeof value === 'string') {
              return `${key}="${value}"`
            }
            return `${key}={${JSON.stringify(value)}}`
          })
          .join(' ')

        content += `/** ${site.domain} - ${variant.description} */
export const ${variantStoryName}: Story = {
  name: '${site.domain} (${variant.name})',
  render: () => <${site.layoutComponent} {...${site.id}Data} ${propsString} />,
  parameters: {
    docs: {
      description: {
        story: '${variant.description}',
      },
    },
  },
}

`
      }
    }
  }

  return content
}
