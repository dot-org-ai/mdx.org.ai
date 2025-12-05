/**
 * Dynamic Site Story Creator
 *
 * Auto-generates Storybook stories from a site registry.
 *
 * @example
 * ```tsx
 * // Sites.stories.tsx
 * import { createSiteStories } from '@mdxui/storybook'
 * import { siteRegistry } from '@mdxui/examples/sites'
 *
 * export default createSiteStories(siteRegistry)
 * export * from './generated' // If you want individual story modules
 * ```
 */

import React from 'react'
import type { Meta, StoryObj, StoryFn } from '@storybook/react'
import type { ComponentType } from 'react'

/**
 * Site entry interface (matches @mdxui/examples)
 */
export interface SiteEntry {
  id: string
  name: string
  domain: string
  description: string
  layout: string
  layoutPackage: string
  layoutComponent: string
  data: Record<string, unknown>
  Component: ComponentType
  variants?: Array<{
    name: string
    description: string
    props: Record<string, unknown>
  }>
}

/**
 * Options for creating site stories
 */
export interface CreateSiteStoriesOptions {
  /** Title prefix for the stories (default: 'Sites') */
  titlePrefix?: string
  /** Whether to include autodocs (default: true) */
  autodocs?: boolean
  /** Additional parameters to add to all stories */
  parameters?: Record<string, unknown>
  /** Filter function to include/exclude sites */
  filter?: (site: SiteEntry) => boolean
}

/**
 * Generated story module structure
 */
export interface GeneratedStoryModule {
  default: Meta<ComponentType>
  Default?: StoryObj<ComponentType>
  [key: string]: Meta<ComponentType> | StoryObj<ComponentType> | undefined
}

/**
 * Create a single story module for a site
 */
export function createSiteStoryModule(
  site: SiteEntry,
  options: CreateSiteStoriesOptions = {}
): GeneratedStoryModule {
  const { titlePrefix = 'Sites', autodocs = true, parameters = {} } = options

  // Create the meta (default export)
  const meta: Meta<ComponentType> = {
    title: `${titlePrefix}/${site.domain}`,
    component: site.Component,
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: `${site.name} - ${site.description}`,
        },
      },
      ...parameters,
    },
    tags: autodocs ? ['autodocs'] : [],
  }

  // Create the default story
  const Default: StoryObj<ComponentType> = {
    name: 'Default',
    render: () => <site.Component />,
    parameters: {
      docs: {
        description: {
          story: `The full ${site.domain} landing page using ${site.layoutComponent}.`,
        },
      },
    },
  }

  // Build the module with default and variants
  const module: GeneratedStoryModule = {
    default: meta,
    Default,
  }

  // Add variant stories
  if (site.variants) {
    for (const variant of site.variants) {
      const VariantStory: StoryObj<ComponentType> = {
        name: variant.name,
        render: () => {
          const LayoutComponent = site.Component
          // For variants, we need to merge the props with the site data
          const mergedData = { ...site.data, ...variant.props }
          // We'll render by spreading the merged data as props
          return React.createElement(LayoutComponent as ComponentType<Record<string, unknown>>, mergedData)
        },
        parameters: {
          docs: {
            description: {
              story: variant.description,
            },
          },
        },
      }
      module[variant.name] = VariantStory
    }
  }

  return module
}

/**
 * Create all site stories as a combined module
 *
 * This creates a "Sites" category with all sites as separate stories
 */
export function createSiteStories(
  registry: SiteEntry[],
  options: CreateSiteStoriesOptions = {}
): Record<string, GeneratedStoryModule> {
  const { filter } = options

  const sites = filter ? registry.filter(filter) : registry
  const modules: Record<string, GeneratedStoryModule> = {}

  for (const site of sites) {
    modules[site.id] = createSiteStoryModule(site, options)
  }

  return modules
}

/**
 * Create a combined story file that renders all sites
 *
 * This is useful for creating a single .stories.tsx file that
 * exports all sites as separate stories within one module.
 */
export function createCombinedSiteStories(
  registry: SiteEntry[],
  options: CreateSiteStoriesOptions = {}
): GeneratedStoryModule {
  const { titlePrefix = 'Sites', autodocs = true, parameters = {}, filter } = options

  const sites = filter ? registry.filter(filter) : registry

  // Use a wrapper component for the meta
  const SitesWrapper: ComponentType<{ siteId: string }> = ({ siteId }) => {
    const site = sites.find((s) => s.id === siteId)
    if (!site) return <div>Site not found: {siteId}</div>
    return <site.Component />
  }

  const meta: Meta<typeof SitesWrapper> = {
    title: titlePrefix,
    component: SitesWrapper,
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component: 'Auto-generated site stories from @mdxui/examples',
        },
      },
      ...parameters,
    },
    tags: autodocs ? ['autodocs'] : [],
  }

  const module: GeneratedStoryModule = {
    default: meta as Meta<ComponentType>,
  }

  // Create a story for each site
  for (const site of sites) {
    const storyName = site.id.charAt(0).toUpperCase() + site.id.slice(1)

    const Story: StoryObj<ComponentType> = {
      name: site.domain,
      render: () => <site.Component />,
      parameters: {
        docs: {
          description: {
            story: `${site.name} - ${site.description}`,
          },
        },
      },
    }

    module[storyName] = Story

    // Add variants as separate stories
    if (site.variants) {
      for (const variant of site.variants) {
        const variantStoryName = `${storyName}${variant.name}`

        const VariantStory: StoryObj<ComponentType> = {
          name: `${site.domain} (${variant.name})`,
          render: () => {
            const mergedData = { ...site.data, ...variant.props }
            return React.createElement(site.Component as ComponentType<Record<string, unknown>>, mergedData)
          },
          parameters: {
            docs: {
              description: {
                story: `${site.domain}: ${variant.description}`,
              },
            },
          },
        }

        module[variantStoryName] = VariantStory
      }
    }
  }

  return module
}

/**
 * Helper to get the layout component dynamically
 *
 * Note: This function requires @mdxui/shadcnblocks and @mdxui/tailark to be installed.
 * Use it in your Storybook app, not in @mdxui/storybook itself.
 *
 * @example
 * ```ts
 * const Layout = await getLayoutComponent('@mdxui/tailark', 'DuskLayout')
 * ```
 */
export async function getLayoutComponent(
  layoutPackage: string,
  layoutComponent: string
): Promise<ComponentType | null> {
  try {
    // Dynamic import based on package - uses eval to avoid static analysis
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await (new Function('p', 'return import(p)')(layoutPackage + '/templates') as Promise<
      Record<string, ComponentType>
    >)
    return mod[layoutComponent] || null
  } catch {
    return null
  }
}
