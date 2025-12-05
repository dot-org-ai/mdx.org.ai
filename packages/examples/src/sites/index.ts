/**
 * Site Registry - All example sites with metadata for auto-generation
 */

import type { ComponentType } from 'react'

// Site data exports
export { AgenticSite, agenticData } from './agentic'
export { AdvertisSite, advertisData } from './advertis'
export { WorkflowSite, workflowData } from './workflow'
export { ScrapeSite, scrapeData } from './scrape'
export { ApiHtSite, apiHtData } from './api-ht'
export { DbHtSite, dbHtData } from './db-ht'
export { HeadlessSite, headlessData } from './headless'
export { MarktSite, marktData } from './markt'

/**
 * Layout type identifiers
 */
export type LayoutType = 'scalar' | 'sonic' | 'lumen' | 'quartz' | 'dusk' | 'mist'

/**
 * Site registry entry with all metadata needed for story generation
 */
export interface SiteEntry {
  /** Unique identifier (used for story names) */
  id: string
  /** Display name of the site */
  name: string
  /** Domain name */
  domain: string
  /** Site description */
  description: string
  /** Layout type used */
  layout: LayoutType
  /** Package containing the layout */
  layoutPackage: '@mdxui/shadcnblocks' | '@mdxui/tailark'
  /** Layout component name */
  layoutComponent: string
  /** The site data object */
  data: Record<string, unknown>
  /** The pre-built site component */
  Component: ComponentType
  /** Optional variants for stories */
  variants?: Array<{
    name: string
    description: string
    props: Record<string, unknown>
  }>
}

// Import all site data and components
import { agenticData, AgenticSite } from './agentic'
import { advertisData, AdvertisSite } from './advertis'
import { workflowData, WorkflowSite } from './workflow'
import { scrapeData, ScrapeSite } from './scrape'
import { apiHtData, ApiHtSite } from './api-ht'
import { dbHtData, DbHtSite } from './db-ht'
import { headlessData, HeadlessSite } from './headless'
import { marktData, MarktSite } from './markt'

/**
 * Complete site registry with all metadata for auto-generating stories
 */
export const siteRegistry: SiteEntry[] = [
  // Tailark layouts
  {
    id: 'agentic',
    name: 'agentic.md',
    domain: 'agentic.md',
    description: 'AI Agents in Markdown - Build powerful AI agents using only Markdown.',
    layout: 'dusk',
    layoutPackage: '@mdxui/tailark',
    layoutComponent: 'DuskLayout',
    data: agenticData,
    Component: AgenticSite,
    variants: [
      {
        name: 'CyanBlueGradient',
        description: 'With cyan-blue gradient instead of purple-blue',
        props: { gradient: 'cyan-blue' },
      },
      {
        name: 'WithoutGlow',
        description: 'Without the glow effect',
        props: { glow: false },
      },
    ],
  },
  {
    id: 'advertis',
    name: 'advertis.ng',
    domain: 'advertis.ng',
    description: 'AI Advertising Platform - Ads that optimize themselves.',
    layout: 'dusk',
    layoutPackage: '@mdxui/tailark',
    layoutComponent: 'DuskLayout',
    data: advertisData,
    Component: AdvertisSite,
    variants: [
      {
        name: 'PurpleBlueGradient',
        description: 'With purple-blue gradient instead of orange-red',
        props: { gradient: 'purple-blue' },
      },
    ],
  },
  {
    id: 'workflow',
    name: 'workflow.md',
    domain: 'workflow.md',
    description: 'Workflows in Markdown - Automation that reads like documentation.',
    layout: 'quartz',
    layoutPackage: '@mdxui/tailark',
    layoutComponent: 'QuartzLayout',
    data: workflowData,
    Component: WorkflowSite,
  },
  {
    id: 'scrape',
    name: 'scrape.md',
    domain: 'scrape.md',
    description: 'Web Scraping for AI - Turn any webpage into clean Markdown.',
    layout: 'mist',
    layoutPackage: '@mdxui/tailark',
    layoutComponent: 'MistLayout',
    data: scrapeData,
    Component: ScrapeSite,
    variants: [
      {
        name: 'WarmTheme',
        description: 'With warm color theme',
        props: { warmth: 'warm' },
      },
    ],
  },

  // Shadcnblocks layouts
  {
    id: 'apiHt',
    name: 'api.ht',
    domain: 'api.ht',
    description: 'HyperText API - Build APIs the way the web was meant to work.',
    layout: 'scalar',
    layoutPackage: '@mdxui/shadcnblocks',
    layoutComponent: 'ScalarLayout',
    data: apiHtData,
    Component: ApiHtSite,
  },
  {
    id: 'dbHt',
    name: 'db.ht',
    domain: 'db.ht',
    description: 'HyperText Database - A database you can browse. Every record is a URL.',
    layout: 'sonic',
    layoutPackage: '@mdxui/shadcnblocks',
    layoutComponent: 'SonicLayout',
    data: dbHtData,
    Component: DbHtSite,
  },
  {
    id: 'headless',
    name: 'headless.ly',
    domain: 'headless.ly',
    description: 'Headless CMS - Content is code. Version-controlled content with AI superpowers.',
    layout: 'lumen',
    layoutPackage: '@mdxui/shadcnblocks',
    layoutComponent: 'LumenLayout',
    data: headlessData,
    Component: HeadlessSite,
  },
  {
    id: 'markt',
    name: 'markt.ng',
    domain: 'markt.ng',
    description: 'AI Marketing Services - Marketing automation that thinks for you.',
    layout: 'scalar',
    layoutPackage: '@mdxui/shadcnblocks',
    layoutComponent: 'ScalarLayout',
    data: marktData,
    Component: MarktSite,
  },
]

/**
 * Get sites by layout type
 */
export function getSitesByLayout(layout: LayoutType): SiteEntry[] {
  return siteRegistry.filter((site) => site.layout === layout)
}

/**
 * Get sites by package
 */
export function getSitesByPackage(pkg: '@mdxui/shadcnblocks' | '@mdxui/tailark'): SiteEntry[] {
  return siteRegistry.filter((site) => site.layoutPackage === pkg)
}

/**
 * Get a site by ID
 */
export function getSiteById(id: string): SiteEntry | undefined {
  return siteRegistry.find((site) => site.id === id)
}

/**
 * Get a site by domain
 */
export function getSiteByDomain(domain: string): SiteEntry | undefined {
  return siteRegistry.find((site) => site.domain === domain)
}
