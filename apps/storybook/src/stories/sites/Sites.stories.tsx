/**
 * Auto-generated Site Stories
 *
 * This file automatically generates Storybook stories from the @mdxui/examples site registry.
 * Each site in the registry becomes a story, along with any configured variants.
 */

import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { siteRegistry } from '@mdxui/examples'

// Import all site components directly for proper rendering
import {
  AgenticSite,
  AdvertisSite,
  WorkflowSite,
  ScrapeSite,
  ApiHtSite,
  DbHtSite,
  HeadlessSite,
  MarktSite,
} from '@mdxui/examples'

// Import layout components for variants
import { DuskLayout, QuartzLayout, MistLayout } from '@mdxui/tailark/templates'
import { ScalarLayout, SonicLayout, LumenLayout } from '@mdxui/shadcnblocks/templates'

// Import site data for variants
import {
  agenticData,
  advertisData,
  workflowData,
  scrapeData,
  apiHtData,
  dbHtData,
  headlessData,
  marktData,
} from '@mdxui/examples'

// Wrapper component that renders any site by ID
const SiteRenderer: React.FC<{ siteId?: string }> = ({ siteId }) => {
  const sites: Record<string, React.FC> = {
    agentic: AgenticSite,
    advertis: AdvertisSite,
    workflow: WorkflowSite,
    scrape: ScrapeSite,
    apiHt: ApiHtSite,
    dbHt: DbHtSite,
    headless: HeadlessSite,
    markt: MarktSite,
  }
  const Site = siteId ? sites[siteId] : null
  if (!Site) return <div>Select a site</div>
  return <Site />
}

const meta: Meta<typeof SiteRenderer> = {
  title: 'Sites',
  component: SiteRenderer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `Auto-generated site stories from @mdxui/examples.\n\nThis includes ${siteRegistry.length} real domain landing pages using various @mdxui layouts.`,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SiteRenderer>

// ============================================
// Tailark Layout Sites
// ============================================

/** agentic.md - AI Agents in Markdown */
export const AgenticMd: Story = {
  name: 'agentic.md',
  render: () => <AgenticSite />,
  parameters: {
    docs: {
      description: {
        story: 'AI Agents in Markdown - Build powerful AI agents using only Markdown. Uses DuskLayout with purple-blue gradient.',
      },
    },
  },
}

/** agentic.md with cyan-blue gradient */
export const AgenticMdCyanBlue: Story = {
  name: 'agentic.md (Cyan-Blue)',
  render: () => <DuskLayout {...agenticData} gradient="cyan-blue" />,
  parameters: {
    docs: {
      description: {
        story: 'agentic.md variant with cyan-blue gradient instead of purple-blue.',
      },
    },
  },
}

/** agentic.md without glow effect */
export const AgenticMdNoGlow: Story = {
  name: 'agentic.md (No Glow)',
  render: () => <DuskLayout {...agenticData} glow={false} />,
  parameters: {
    docs: {
      description: {
        story: 'agentic.md variant without the glow effect.',
      },
    },
  },
}

/** advertis.ng - AI Advertising Platform */
export const AdvertisNg: Story = {
  name: 'advertis.ng',
  render: () => <AdvertisSite />,
  parameters: {
    docs: {
      description: {
        story: 'AI Advertising Platform - Ads that optimize themselves. Uses DuskLayout with orange-red gradient.',
      },
    },
  },
}

/** advertis.ng with purple-blue gradient */
export const AdvertisNgPurpleBlue: Story = {
  name: 'advertis.ng (Purple-Blue)',
  render: () => <DuskLayout {...advertisData} gradient="purple-blue" />,
  parameters: {
    docs: {
      description: {
        story: 'advertis.ng variant with purple-blue gradient instead of orange-red.',
      },
    },
  },
}

/** workflow.md - Workflows in Markdown */
export const WorkflowMd: Story = {
  name: 'workflow.md',
  render: () => <WorkflowSite />,
  parameters: {
    docs: {
      description: {
        story: 'Workflows in Markdown - Automation that reads like documentation. Uses QuartzLayout.',
      },
    },
  },
}

/** scrape.md - Web Scraping for AI */
export const ScrapeMd: Story = {
  name: 'scrape.md',
  render: () => <ScrapeSite />,
  parameters: {
    docs: {
      description: {
        story: 'Web Scraping for AI - Turn any webpage into clean Markdown. Uses MistLayout with cool theme.',
      },
    },
  },
}

/** scrape.md with warm theme */
export const ScrapeMdWarm: Story = {
  name: 'scrape.md (Warm)',
  render: () => <MistLayout {...scrapeData} warmth="warm" />,
  parameters: {
    docs: {
      description: {
        story: 'scrape.md variant with warm color theme.',
      },
    },
  },
}

// ============================================
// Shadcnblocks Layout Sites
// ============================================

/** api.ht - HyperText API */
export const ApiHt: Story = {
  name: 'api.ht',
  render: () => <ApiHtSite />,
  parameters: {
    docs: {
      description: {
        story: 'HyperText API - Build APIs the way the web was meant to work. Uses ScalarLayout.',
      },
    },
  },
}

/** db.ht - HyperText Database */
export const DbHt: Story = {
  name: 'db.ht',
  render: () => <DbHtSite />,
  parameters: {
    docs: {
      description: {
        story: 'HyperText Database - A database you can browse. Every record is a URL. Uses SonicLayout.',
      },
    },
  },
}

/** headless.ly - Headless CMS */
export const HeadlessLy: Story = {
  name: 'headless.ly',
  render: () => <HeadlessSite />,
  parameters: {
    docs: {
      description: {
        story: 'Headless CMS - Content is code. Version-controlled content with AI superpowers. Uses LumenLayout.',
      },
    },
  },
}

/** markt.ng - AI Marketing Services */
export const MarktNg: Story = {
  name: 'markt.ng',
  render: () => <MarktSite />,
  parameters: {
    docs: {
      description: {
        story: 'AI Marketing Services - Marketing automation that thinks for you. Uses ScalarLayout.',
      },
    },
  },
}
