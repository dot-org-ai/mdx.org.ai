#!/usr/bin/env ts-node
/**
 * Download Zapier Service Logos
 *
 * This script downloads PNG logos for Zapier services from the Zapier CDN.
 * It processes the Zapier dataset to extract service information and logo URLs,
 * then downloads them with rate limiting and error handling.
 *
 * Features:
 * - Rate limiting to respect Zapier CDN
 * - Resume capability (skips already downloaded)
 * - Progress tracking
 * - Manifest generation with metadata
 * - TitleCase naming for easy reference
 * - Priority-based downloading (popular services first)
 *
 * Usage:
 *   ./download-zapier-logos.ts [--batch-size=50] [--rate-limit=100] [--priority-only]
 */

import { createWriteStream } from 'fs'
import { mkdir, access, readFile, writeFile, stat } from 'fs/promises'
import { join, dirname } from 'path'
import https from 'https'
import http from 'http'

// Configuration
const CONFIG = {
  // Source data
  dataDir: '/Users/nathanclevenger/projects/.org.ai/platform/packages/integrations/data/zapier',
  appsDataPath: '/Users/nathanclevenger/projects/.org.ai/platform/sites/integrations.org.ai/data/apps.json',

  // Output directories
  outputDir: '/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier',
  priorityDir: '/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/priority',
  allDir: '/Users/nathanclevenger/projects/.org.ai/schema/logos/zapier/all',

  // Download settings
  batchSize: process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || 50,
  rateLimitMs: parseInt(process.argv.find(a => a.startsWith('--rate-limit='))?.split('=')[1] || '100'),
  priorityOnly: process.argv.includes('--priority-only'),
  maxRetries: 3,
  timeout: 30000,

  // CDN URL patterns
  zapierCdnBase: 'https://cdn.zapier.com',
  zapierStoragePattern: 'https://cdn.zapier.com/storage/services/',

  // Priority services (top 100 most popular from summary.json)
  priorityServices: [
    'hubspot', 'google-sheets', 'gmail', 'slack', 'trello', 'salesforce',
    'microsoft-outlook', 'activecampaign', 'mailchimp', 'google-drive',
    'dropbox', 'asana', 'monday', 'airtable', 'notion', 'clickup',
    'zapier-tables', 'google-calendar', 'stripe', 'paypal', 'square',
    'shopify', 'woocommerce', 'facebook', 'twitter', 'instagram',
    'linkedin', 'youtube', 'tiktok', 'discord', 'twilio', 'sendgrid',
    'zoom', 'microsoft-teams', 'calendly', 'typeform', 'jotform',
    'surveymonkey', 'eventbrite', 'zendesk', 'freshdesk', 'intercom',
    'drift', 'pipedrive', 'copper', 'zoho-crm', 'close', 'freshsales',
    'quickbooks', 'xero', 'freshbooks', 'wave', 'greenhouse', 'lever',
    'workable', 'bamboohr', 'gusto', 'adp', 'docusign', 'hellosign',
    'pandadoc', 'adobe-sign', 'clickfunnels', 'unbounce', 'convertkit',
    'drip', 'getresponse', 'aweber', 'constant-contact', 'sendinblue',
    'google-ads', 'facebook-ads', 'linkedin-ads', 'hubspot-crm',
    'google-analytics', 'mixpanel', 'amplitude', 'segment', 'hotjar',
    'intercom', 'drift', 'crisp', 'livechat', 'olark', 'tawk',
    'basecamp', 'todoist', 'any-do', 'microsoft-to-do', 'things',
    'omnifocus', 'toggl', 'harvest', 'clockify', 'rescuetime', 'timely'
  ]
}

// Types
interface ZapierApp {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  website?: string
  popularity?: string
  pricing?: string
}

interface ServiceInfo {
  slug: string
  name: string
  logoUrl?: string
  filename: string
  category?: string
  popularity?: string
  isPriority: boolean
}

interface DownloadResult {
  service: string
  success: boolean
  filename?: string
  size?: number
  dimensions?: string
  error?: string
  url?: string
}

interface Manifest {
  downloaded: string
  totalServices: number
  successfulDownloads: number
  failed: number
  priorityDownloads: number
  estimatedSize: string
  logos: Array<{
    service: string
    zapierSlug: string
    filename: string
    size: string
    dimensions?: string
    url: string
    category?: string
    isPriority: boolean
  }>
  errors: Array<{
    service: string
    zapierSlug: string
    url?: string
    error: string
  }>
}

// Utilities
function toTitleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function getFileSize(path: string): Promise<number> {
  try {
    const stats = await stat(path)
    return stats.size
  } catch {
    return 0
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Load service data
async function loadServiceData(): Promise<ServiceInfo[]> {
  console.log('📊 Loading Zapier service data...')

  const services = new Map<string, ServiceInfo>()

  // Load apps.json (has icon URLs for some popular apps)
  try {
    const appsData = JSON.parse(await readFile(CONFIG.appsDataPath, 'utf-8'))
    if (appsData.apps) {
      for (const app of appsData.apps) {
        services.set(app.id, {
          slug: app.id,
          name: app.name,
          logoUrl: app.icon,
          filename: `${toTitleCase(app.name)}.png`,
          category: app.category,
          popularity: app.popularity,
          isPriority: CONFIG.priorityServices.includes(app.id)
        })
      }
      console.log(`  ✓ Loaded ${appsData.apps.length} apps with icon URLs`)
    }
  } catch (error) {
    console.log(`  ⚠ Could not load apps.json: ${error}`)
  }

  // Load service slugs from nouns-cleaned.json
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

    console.log(`  ✓ Found ${uniqueServices.size} unique services from nouns data`)

    // Add services that don't have icon URLs yet
    for (const slug of uniqueServices) {
      if (!services.has(slug)) {
        // Try to construct name from slug
        const name = slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        services.set(slug, {
          slug,
          name,
          filename: `${toTitleCase(name)}.png`,
          isPriority: CONFIG.priorityServices.includes(slug)
        })
      }
    }
  } catch (error) {
    console.log(`  ⚠ Could not load nouns-cleaned.json: ${error}`)
  }

  const serviceList = Array.from(services.values())
  console.log(`\n📈 Service Statistics:`)
  console.log(`  • Total services: ${serviceList.length}`)
  console.log(`  • Priority services: ${serviceList.filter(s => s.isPriority).length}`)
  console.log(`  • Services with icon URLs: ${serviceList.filter(s => s.logoUrl).length}`)
  console.log(`  • Services needing URL discovery: ${serviceList.filter(s => !s.logoUrl).length}`)

  return serviceList
}

// Download a single logo
async function downloadLogo(service: ServiceInfo, retries = 0): Promise<DownloadResult> {
  if (!service.logoUrl) {
    return {
      service: service.name,
      success: false,
      error: 'No logo URL available'
    }
  }

  const targetDir = service.isPriority ? CONFIG.priorityDir : CONFIG.allDir
  const filepath = join(targetDir, service.filename)

  // Skip if already downloaded
  if (await fileExists(filepath)) {
    const size = await getFileSize(filepath)
    return {
      service: service.name,
      success: true,
      filename: service.filename,
      size,
      url: service.logoUrl
    }
  }

  return new Promise((resolve) => {
    const urlObj = new URL(service.logoUrl!)
    const client = urlObj.protocol === 'https:' ? https : http

    const timeout = setTimeout(() => {
      req.destroy()
      if (retries < CONFIG.maxRetries) {
        console.log(`  ⚠ Timeout for ${service.name}, retrying... (${retries + 1}/${CONFIG.maxRetries})`)
        sleep(CONFIG.rateLimitMs * 2).then(() => {
          resolve(downloadLogo(service, retries + 1))
        })
      } else {
        resolve({
          service: service.name,
          success: false,
          error: 'Timeout after retries',
          url: service.logoUrl
        })
      }
    }, CONFIG.timeout)

    const req = client.get(service.logoUrl!, (res) => {
      clearTimeout(timeout)

      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location
        if (redirectUrl) {
          service.logoUrl = redirectUrl
          resolve(downloadLogo(service, retries))
          return
        }
      }

      if (res.statusCode !== 200) {
        if (retries < CONFIG.maxRetries) {
          sleep(CONFIG.rateLimitMs * 2).then(() => {
            resolve(downloadLogo(service, retries + 1))
          })
        } else {
          resolve({
            service: service.name,
            success: false,
            error: `HTTP ${res.statusCode}`,
            url: service.logoUrl
          })
        }
        return
      }

      const fileStream = createWriteStream(filepath)
      let downloadedSize = 0

      res.on('data', (chunk) => {
        downloadedSize += chunk.length
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve({
          service: service.name,
          success: true,
          filename: service.filename,
          size: downloadedSize,
          url: service.logoUrl
        })
      })

      fileStream.on('error', (err) => {
        fileStream.close()
        if (retries < CONFIG.maxRetries) {
          sleep(CONFIG.rateLimitMs * 2).then(() => {
            resolve(downloadLogo(service, retries + 1))
          })
        } else {
          resolve({
            service: service.name,
            success: false,
            error: err.message,
            url: service.logoUrl
          })
        }
      })
    })

    req.on('error', (err) => {
      clearTimeout(timeout)
      if (retries < CONFIG.maxRetries) {
        sleep(CONFIG.rateLimitMs * 2).then(() => {
          resolve(downloadLogo(service, retries + 1))
        })
      } else {
        resolve({
          service: service.name,
          success: false,
          error: err.message,
          url: service.logoUrl
        })
      }
    })
  })
}

// Main download function
async function downloadLogos() {
  console.log('🚀 Zapier Logo Downloader\n')
  console.log(`Configuration:`)
  console.log(`  • Batch size: ${CONFIG.batchSize}`)
  console.log(`  • Rate limit: ${CONFIG.rateLimitMs}ms`)
  console.log(`  • Priority only: ${CONFIG.priorityOnly}`)
  console.log(`  • Output directory: ${CONFIG.outputDir}\n`)

  // Ensure output directories exist
  await mkdir(CONFIG.outputDir, { recursive: true })
  await mkdir(CONFIG.priorityDir, { recursive: true })
  await mkdir(CONFIG.allDir, { recursive: true })

  // Load service data
  const services = await loadServiceData()

  // Filter services
  let servicesToDownload = services.filter(s => s.logoUrl)
  if (CONFIG.priorityOnly) {
    servicesToDownload = servicesToDownload.filter(s => s.isPriority)
  }

  // Sort: priority first, then by name
  servicesToDownload.sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1
    if (!a.isPriority && b.isPriority) return 1
    return a.name.localeCompare(b.name)
  })

  console.log(`\n📥 Downloading ${servicesToDownload.length} logos...\n`)

  const results: DownloadResult[] = []
  const batchSize = parseInt(CONFIG.batchSize as string)

  // Download in batches
  for (let i = 0; i < servicesToDownload.length; i += batchSize) {
    const batch = servicesToDownload.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(servicesToDownload.length / batchSize)

    console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} logos)`)

    const batchResults = await Promise.all(
      batch.map(async (service) => {
        const result = await downloadLogo(service)
        const icon = result.success ? '✓' : '✗'
        const sizeStr = result.size ? ` (${formatBytes(result.size)})` : ''
        console.log(`  ${icon} ${service.name}${sizeStr}`)
        return result
      })
    )

    results.push(...batchResults)

    // Rate limiting between batches
    if (i + batchSize < servicesToDownload.length) {
      await sleep(CONFIG.rateLimitMs * 10)
    }
  }

  // Generate manifest
  console.log('\n📝 Generating manifest...')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const totalSize = successful.reduce((sum, r) => sum + (r.size || 0), 0)

  const manifest: Manifest = {
    downloaded: new Date().toISOString().split('T')[0],
    totalServices: servicesToDownload.length,
    successfulDownloads: successful.length,
    failed: failed.length,
    priorityDownloads: successful.filter(r => {
      const service = services.find(s => s.name === r.service)
      return service?.isPriority
    }).length,
    estimatedSize: formatBytes(totalSize),
    logos: successful.map(r => {
      const service = services.find(s => s.name === r.service)!
      return {
        service: r.service,
        zapierSlug: service.slug,
        filename: r.filename!,
        size: formatBytes(r.size || 0),
        dimensions: r.dimensions,
        url: r.url!,
        category: service.category,
        isPriority: service.isPriority
      }
    }),
    errors: failed.map(r => {
      const service = services.find(s => s.name === r.service)!
      return {
        service: r.service,
        zapierSlug: service.slug,
        url: r.url,
        error: r.error || 'Unknown error'
      }
    })
  }

  const manifestPath = join(CONFIG.outputDir, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.log('\n✅ Download Complete!\n')
  console.log('Summary:')
  console.log(`  ✓ Successful: ${successful.length}`)
  console.log(`  ✗ Failed: ${failed.length}`)
  console.log(`  📦 Total size: ${formatBytes(totalSize)}`)
  console.log(`  🎯 Priority logos: ${manifest.priorityDownloads}`)
  console.log(`  📄 Manifest: ${manifestPath}\n`)

  if (failed.length > 0) {
    console.log('Failed downloads:')
    failed.forEach(r => {
      console.log(`  ✗ ${r.service}: ${r.error}`)
    })
  }
}

// Run
downloadLogos().catch(console.error)
