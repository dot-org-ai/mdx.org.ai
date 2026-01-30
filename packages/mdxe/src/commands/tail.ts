/**
 * mdxe tail command
 *
 * Provides real-time and historical event tailing for mdxe applications.
 * Supports WebSocket live streaming and HTTP polling modes with filtering
 * by source, type, and importance level.
 *
 * @example
 * ```bash
 * # Live WebSocket streaming
 * mdxe tail --live
 *
 * # Follow mode (HTTP polling)
 * mdxe tail --follow
 *
 * # Historical events from last hour
 * mdxe tail --since 1h
 *
 * # Filter by source and importance
 * mdxe tail --source "mdxe-*" --importance high
 *
 * # JSON output for piping
 * mdxe tail --json | jq '.type'
 * ```
 *
 * @module mdxe/commands/tail
 */

import type { MdxeEvent, EventImportance } from '../tail/types.js'
import type { EventFilter } from '../tail/filter.js'
import { TailClient } from '../tail/ws-client.js'
import { HistoricalTailPoller, fetchHistoricalEvents } from '../tail/historical.js'
import { isValidImportance } from '../tail/types.js'

/**
 * Options for the tail command
 */
export interface TailCommandOptions {
  /** Use WebSocket for live streaming */
  live: boolean
  /** Use HTTP polling for follow mode */
  follow: boolean
  /** Event filter options */
  filter?: EventFilter
  /** Start time for historical events */
  since?: Date
  /** End time for historical events */
  until?: Date
  /** Maximum number of events to show */
  limit?: number
  /** Output as JSON (one event per line) */
  json: boolean
  /** Disable colored output */
  noColor: boolean
  /** Base URL for the tail API */
  url: string
  /** Verbose output */
  verbose: boolean
}

/** ANSI color codes */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
} as const

/**
 * Get the ANSI color code for an importance level
 */
export function getColorForImportance(importance: EventImportance): string {
  switch (importance) {
    case 'critical':
      return COLORS.red
    case 'high':
      return COLORS.yellow
    case 'low':
      return COLORS.gray
    case 'normal':
    default:
      return COLORS.reset
  }
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * Format data object for display (compact JSON)
 */
function formatData(data: Record<string, unknown>): string {
  if (Object.keys(data).length === 0) {
    return ''
  }
  return JSON.stringify(data)
}

/**
 * Format options for formatEvent
 */
interface FormatOptions {
  noColor: boolean
  json: boolean
}

/**
 * Format an event for console output
 *
 * Default format:
 * TIMESTAMP IMPORTANCE SOURCE TYPE [DATA]
 *
 * Example:
 * 2024-01-30 20:00:00.000 normal mdxe-build build_started {"target":"production"}
 */
export function formatEvent(event: MdxeEvent, options: FormatOptions): string {
  // JSON output mode
  if (options.json) {
    return JSON.stringify(event)
  }

  const timestamp = formatTimestamp(event.timestamp)
  const data = formatData(event.data)

  if (options.noColor) {
    // Plain text format
    return `${timestamp} ${event.importance.padEnd(8)} ${event.source} ${event.type}${data ? ' ' + data : ''}`
  }

  // Colored format
  const color = getColorForImportance(event.importance)
  const reset = COLORS.reset
  const dim = COLORS.dim
  const cyan = COLORS.cyan

  return (
    `${dim}${timestamp}${reset} ` +
    `${color}${event.importance.padEnd(8)}${reset} ` +
    `${cyan}${event.source}${reset} ` +
    `${event.type}` +
    `${data ? ' ' + dim + data + reset : ''}`
  )
}

/**
 * Parse a relative time string (e.g., "1h", "30m", "2d") to a Date
 */
function parseRelativeTime(value: string): Date | undefined {
  const match = value.match(/^(\d+)([smhd])$/)
  if (!match || !match[1] || !match[2]) {
    return undefined
  }

  const num = parseInt(match[1], 10)
  const unit = match[2]

  let ms: number
  switch (unit) {
    case 's':
      ms = num * 1000
      break
    case 'm':
      ms = num * 60 * 1000
      break
    case 'h':
      ms = num * 60 * 60 * 1000
      break
    case 'd':
      ms = num * 24 * 60 * 60 * 1000
      break
    default:
      return undefined
  }

  return new Date(Date.now() - ms)
}

/**
 * Parse a time value (ISO string or relative time)
 */
function parseTime(value: string): Date | undefined {
  // Try relative time first
  const relative = parseRelativeTime(value)
  if (relative) {
    return relative
  }

  // Try ISO date string
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date
  }

  return undefined
}

/**
 * Parse command line arguments for the tail command
 */
export function parseTailArgs(args: string[]): TailCommandOptions {
  const options: TailCommandOptions = {
    live: false,
    follow: false,
    json: false,
    noColor: false,
    url: process.env.MDXE_TAIL_URL || 'https://api.mdxe.do/tail',
    verbose: false,
  }

  let filter: EventFilter = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      // Mode options
      case '--live':
        options.live = true
        break
      case '--follow':
      case '-f':
        options.follow = true
        break

      // Filter options
      case '--source':
        filter.source = next
        i++
        break
      case '--type':
        filter.type = next
        i++
        break
      case '--importance':
      case '-i':
        if (next && isValidImportance(next)) {
          filter.minImportance = next as EventImportance
        }
        i++
        break

      // Time options
      case '--since':
        if (next) {
          options.since = parseTime(next)
        }
        i++
        break
      case '--until':
        if (next) {
          options.until = parseTime(next)
        }
        i++
        break

      // Output options
      case '--limit':
      case '-n':
        if (next) {
          options.limit = parseInt(next, 10)
        }
        i++
        break
      case '--json':
        options.json = true
        break
      case '--no-color':
        options.noColor = true
        break

      // Server options
      case '--url':
        if (next) {
          options.url = next
        }
        i++
        break

      // Other options
      case '--verbose':
      case '-v':
        options.verbose = true
        break
    }
  }

  // Only set filter if at least one field is defined
  if (filter.source || filter.type || filter.minImportance) {
    options.filter = filter
  }

  return options
}

/**
 * Print an event to stdout
 */
function printEvent(event: MdxeEvent, options: TailCommandOptions): void {
  const output = formatEvent(event, {
    noColor: options.noColor,
    json: options.json,
  })
  console.log(output)
}

/**
 * Run the tail command in live WebSocket mode
 */
async function runLiveMode(options: TailCommandOptions): Promise<void> {
  if (options.verbose) {
    console.error(`Connecting to ${options.url} (WebSocket)...`)
  }

  // Convert HTTP URL to WebSocket URL
  const wsUrl = options.url.replace(/^http/, 'ws')

  return new Promise((resolve, reject) => {
    const client = new TailClient({
      url: wsUrl,
      filter: options.filter,
      onEvent: (event) => {
        printEvent(event, options)
      },
      onConnect: () => {
        if (options.verbose) {
          console.error('Connected. Streaming events...')
        }
      },
      onDisconnect: () => {
        if (options.verbose) {
          console.error('Disconnected.')
        }
        resolve()
      },
      onError: (error) => {
        console.error(`Error: ${error.message}`)
        reject(error)
      },
      reconnect: true,
    })

    client.connect()

    // Handle SIGINT for clean shutdown
    process.on('SIGINT', () => {
      if (options.verbose) {
        console.error('\nDisconnecting...')
      }
      client.disconnect()
    })
  })
}

/**
 * Run the tail command in follow (polling) mode
 */
async function runFollowMode(options: TailCommandOptions): Promise<void> {
  if (options.verbose) {
    console.error(`Polling ${options.url}...`)
  }

  return new Promise((resolve) => {
    const poller = new HistoricalTailPoller({
      baseUrl: options.url,
      filter: options.filter,
      onEvents: (events) => {
        for (const event of events) {
          printEvent(event, options)
        }
      },
      onError: (error) => {
        console.error(`Polling error: ${error.message}`)
      },
      pollIntervalMs: 2000,
    })

    poller.start()

    // Handle SIGINT for clean shutdown
    process.on('SIGINT', () => {
      if (options.verbose) {
        console.error('\nStopping poller...')
      }
      poller.stop()
      resolve()
    })
  })
}

/**
 * Run the tail command in historical mode (one-time fetch)
 */
async function runHistoricalMode(options: TailCommandOptions): Promise<void> {
  if (options.verbose) {
    console.error(`Fetching historical events from ${options.url}...`)
  }

  try {
    const result = await fetchHistoricalEvents({
      baseUrl: options.url,
      filter: options.filter,
      since: options.since,
      until: options.until,
      limit: options.limit,
    })

    for (const event of result.events) {
      printEvent(event, options)
    }

    if (options.verbose) {
      console.error(`Fetched ${result.events.length} event(s)`)
      if (result.hasMore) {
        console.error('More events available. Use --limit to fetch more.')
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    }
    process.exit(1)
  }
}

/**
 * Run the mdxe tail command
 */
export async function runTail(options: TailCommandOptions): Promise<void> {
  // Show header unless JSON mode
  if (!options.json) {
    console.error('mdxe tail\n')
  }

  if (options.live) {
    await runLiveMode(options)
  } else if (options.follow) {
    await runFollowMode(options)
  } else {
    await runHistoricalMode(options)
  }
}

export type { EventFilter }
