#!/usr/bin/env ts-node
/**
 * Discover Zapier Logo URLs
 *
 * This script attempts to discover logo URLs for Zapier services that don't
 * have them in our dataset. It uses multiple strategies:
 *
 * 1. Scrape Zapier directory (zapier.com/apps)
 * 2. Try Zapier Platform API (if available)
 * 3. Search SimpleIcons for matching services
 * 4. Extract from Zapier app pages
 *
 * Usage:
 *   ./discover-zapier-logo-urls.ts [--method=scrape|api|simpleicons|all]
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import https from 'https'

// Configuration
const CONFIG = {
  dataDir: '/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier',
  appsDataPath: '/Users/nathanclevenger/projects/.org.ai/platform/sites/integrations.org.ai/data/apps.json',
  outputPath: '/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/discovered-urls.json',

  // Zapier URLs
  zapierAppsDir: 'https://zapier.com/apps',
  zapierApiBase: 'https://api.zapier.com/v1',

  // SimpleIcons
  simpleIconsBase: 'https://cdn.simpleicons.org',
  simpleIconsData: '/Users/nathanclevenger/projects/.org.ai/schema/logos/simpleicons/_data/simple-icons.json',

  method: process.argv.find(a => a.startsWith('--method='))?.split('=')[1] || 'all',
  rateLimitMs: 500, // Be respectful to Zapier
}

interface ServiceInfo {
  slug: string
  name: string
  logoUrl?: string
  source?: 'apps.json' | 'scrape' | 'api' | 'simpleicons' | 'manual'
}

interface DiscoveredUrls {
  discovered: string
  totalServices: number
  servicesWithUrls: number
  servicesNeedingUrls: number
  methods: {
    [key: string]: number
  }
  services: ServiceInfo[]
}

// Utilities
function toTitleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function slugToSimpleIconName(slug: string): string[] {
  // Try different variations
  const variations = [
    slug,
    slug.replace(/-/g, ''),
    slug.replace(/-/g, '').toLowerCase(),
    slug.split('-')[0], // First word only
  ]

  // Add specific mappings
  const mappings: { [key: string]: string } = {
    'google-sheets': 'googlesheets',
    'google-drive': 'googledrive',
    'google-calendar': 'googlecalendar',
    'google-docs': 'googledocs',
    'google-ads': 'googleads',
    'google-analytics': 'googleanalytics',
    'microsoft-outlook': 'microsoftoutlook',
    'microsoft-teams': 'microsoftteams',
    'microsoft-to-do': 'microsofttodo',
    'hubspot-crm': 'hubspot',
    'facebook-ads': 'facebook',
    'linkedin-ads': 'linkedin',
  }

  if (mappings[slug]) {
    variations.unshift(mappings[slug])
  }

  return [...new Set(variations)]
}

async function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// Load existing service data
async function loadServices(): Promise<Map<string, ServiceInfo>> {
  console.log('📊 Loading service data...')

  const services = new Map<string, ServiceInfo>()

  // Load apps.json (existing URLs)
  try {
    const appsData = JSON.parse(await readFile(CONFIG.appsDataPath, 'utf-8'))
    if (appsData.apps) {
      for (const app of appsData.apps) {
        services.set(app.id, {
          slug: app.id,
          name: app.name,
          logoUrl: app.icon,
          source: 'apps.json'
        })
      }
      console.log(`  ✓ Loaded ${appsData.apps.length} apps with existing URLs`)
    }
  } catch (error) {
    console.log(`  ⚠ Could not load apps.json`)
  }

  // Load all service slugs
  try {
    const nounsData = JSON.parse(await readFile(join(CONFIG.dataDir, 'nouns-cleaned.json'), 'utf-8'))
    const uniqueServices = new Set<string>()

    for (const noun of nounsData) {
      if (noun.services && Array.isArray(noun.services)) {
        for (const service of noun.services) {
          uniqueServices.add(service)
        }
      }
    }

    console.log(`  ✓ Found ${uniqueServices.size} unique services`)

    // Add services without URLs
    for (const slug of uniqueServices) {
      if (!services.has(slug)) {
        const name = slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        services.set(slug, {
          slug,
          name
        })
      }
    }
  } catch (error) {
    console.log(`  ⚠ Could not load nouns-cleaned.json`)
  }

  return services
}

// Strategy 1: Try SimpleIcons
async function discoverViaSimpleIcons(services: Map<string, ServiceInfo>): Promise<number> {
  console.log('\n🎨 Attempting SimpleIcons discovery...')

  let discovered = 0
  const servicesNeedingUrls = Array.from(services.values()).filter(s => !s.logoUrl)

  try {
    const simpleIconsData = JSON.parse(await readFile(CONFIG.simpleIconsData, 'utf-8'))
    const iconMap = new Map<string, string>()

    for (const icon of simpleIconsData.icons) {
      iconMap.set(icon.slug, icon.slug)
      iconMap.set(icon.title.toLowerCase(), icon.slug)
    }

    console.log(`  • SimpleIcons has ${iconMap.size} icons`)

    for (const service of servicesNeedingUrls) {
      const variations = slugToSimpleIconName(service.slug)

      for (const variant of variations) {
        if (iconMap.has(variant)) {
          const iconSlug = iconMap.get(variant)!
          service.logoUrl = `${CONFIG.simpleIconsBase}/${iconSlug}`
          service.source = 'simpleicons'
          discovered++
          console.log(`  ✓ ${service.name} → ${iconSlug}`)
          break
        }
      }
    }

    console.log(`  • Discovered ${discovered} URLs via SimpleIcons`)
  } catch (error) {
    console.log(`  ⚠ SimpleIcons data not available`)
  }

  return discovered
}

// Strategy 2: Scrape Zapier Directory (placeholder - needs implementation)
async function discoverViaScraping(services: Map<string, ServiceInfo>): Promise<number> {
  console.log('\n🌐 Web scraping discovery (not implemented)...')
  console.log('  ℹ This would require:')
  console.log('    1. Visit zapier.com/apps/{slug}')
  console.log('    2. Extract logo URL from page HTML')
  console.log('    3. Map to service in our dataset')
  console.log('  ⚠ Implementation requires HTTP client and HTML parser')
  console.log('  ⚠ Would need rate limiting to avoid overwhelming Zapier')
  return 0
}

// Strategy 3: Zapier Platform API (placeholder - needs API key)
async function discoverViaAPI(services: Map<string, ServiceInfo>): Promise<number> {
  console.log('\n🔑 Zapier API discovery (not implemented)...')
  console.log('  ℹ This would require:')
  console.log('    1. Zapier Platform API key')
  console.log('    2. Call GET /v1/apps endpoint')
  console.log('    3. Extract icon URLs from response')
  console.log('  ⚠ Requires authentication')
  return 0
}

// Manual mappings for popular services
function applyManualMappings(services: Map<string, ServiceInfo>): number {
  console.log('\n📝 Applying manual mappings...')

  const mappings: { [slug: string]: string } = {
    // These would need to be manually discovered and added
    // Example pattern:
    // 'service-slug': 'https://cdn.zapier.com/storage/services/HASH.png'
  }

  let applied = 0
  for (const [slug, url] of Object.entries(mappings)) {
    const service = services.get(slug)
    if (service && !service.logoUrl) {
      service.logoUrl = url
      service.source = 'manual'
      applied++
    }
  }

  console.log(`  • Applied ${applied} manual mappings`)
  return applied
}

// Main discovery function
async function discoverUrls() {
  console.log('🔍 Zapier Logo URL Discovery\n')

  const services = await loadServices()

  const stats = {
    total: services.size,
    withUrls: Array.from(services.values()).filter(s => s.logoUrl).length,
    needingUrls: Array.from(services.values()).filter(s => !s.logoUrl).length
  }

  console.log(`\n📊 Initial Statistics:`)
  console.log(`  • Total services: ${stats.total}`)
  console.log(`  • With URLs: ${stats.withUrls}`)
  console.log(`  • Needing URLs: ${stats.needingUrls}`)

  const methods: { [key: string]: number } = {}

  // Run discovery methods
  if (CONFIG.method === 'all' || CONFIG.method === 'simpleicons') {
    methods.simpleicons = await discoverViaSimpleIcons(services)
  }

  if (CONFIG.method === 'all' || CONFIG.method === 'scrape') {
    methods.scrape = await discoverViaScraping(services)
  }

  if (CONFIG.method === 'all' || CONFIG.method === 'api') {
    methods.api = await discoverViaAPI(services)
  }

  methods.manual = applyManualMappings(services)

  // Generate output
  const finalStats = {
    total: services.size,
    withUrls: Array.from(services.values()).filter(s => s.logoUrl).length,
    needingUrls: Array.from(services.values()).filter(s => !s.logoUrl).length
  }

  const output: DiscoveredUrls = {
    discovered: new Date().toISOString().split('T')[0],
    totalServices: finalStats.total,
    servicesWithUrls: finalStats.withUrls,
    servicesNeedingUrls: finalStats.needingUrls,
    methods,
    services: Array.from(services.values())
      .sort((a, b) => {
        if (a.logoUrl && !b.logoUrl) return -1
        if (!a.logoUrl && b.logoUrl) return 1
        return a.name.localeCompare(b.name)
      })
  }

  await writeFile(CONFIG.outputPath, JSON.stringify(output, null, 2))

  console.log(`\n✅ Discovery Complete!\n`)
  console.log('Final Statistics:')
  console.log(`  • Total services: ${finalStats.total}`)
  console.log(`  • With URLs: ${finalStats.withUrls} (+${finalStats.withUrls - stats.withUrls})`)
  console.log(`  • Still needing URLs: ${finalStats.needingUrls}`)
  console.log(`\nDiscovery methods:`)
  Object.entries(methods).forEach(([method, count]) => {
    if (count > 0) {
      console.log(`  • ${method}: ${count}`)
    }
  })
  console.log(`\n📄 Output saved to: ${CONFIG.outputPath}`)
  console.log(`\n💡 Next steps:`)
  console.log(`  1. Review discovered-urls.json`)
  console.log(`  2. Update apps.json with new URLs`)
  console.log(`  3. Run download-zapier-logos.ts`)
}

// Run
discoverUrls().catch(console.error)
