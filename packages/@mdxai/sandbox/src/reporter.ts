import { SandboxProcess, StreamEvent } from './types'
import { streamEvents } from './stream-parser'

/**
 * Configuration for the SandboxReporter
 */
export interface ReporterConfig {
  sessionUrl: string
  authToken?: string
  retryAttempts?: number
  retryDelay?: number
}

/**
 * SandboxReporter streams events from a sandbox process to a SessionDO
 *
 * This class handles:
 * - Reading stdout from sandbox process
 * - Parsing stream-json events
 * - POSTing events to SessionDO /event endpoint
 * - Retry logic for failed requests
 * - Error handling and reporting
 */
export class SandboxReporter {
  private sessionUrl: string
  private authToken?: string
  private retryAttempts: number
  private retryDelay: number

  constructor(config: ReporterConfig) {
    this.sessionUrl = config.sessionUrl
    this.authToken = config.authToken
    this.retryAttempts = config.retryAttempts ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  /**
   * Stream events from sandbox process to SessionDO
   *
   * This method reads stdout from the sandbox process, parses stream-json
   * events, and POSTs each event to the SessionDO /event endpoint.
   *
   * @param proc - Sandbox process handle
   * @returns Promise that resolves when all events are reported
   */
  async streamToSession(proc: SandboxProcess): Promise<void> {
    const startedAt = new Date()

    try {
      // Stream and report all events
      for await (const event of streamEvents(proc.stdout)) {
        await this.reportEvent(event)
      }

      // Wait for process to complete
      const exitCode = await proc.exitCode
      const completedAt = new Date()

      // Report completion
      await this.reportEvent({
        type: 'complete',
        exitCode,
      })

      console.log(
        `Sandbox process completed with exit code ${exitCode} in ${
          completedAt.getTime() - startedAt.getTime()
        }ms`
      )
    } catch (error) {
      console.error('Error streaming events to session:', error)

      // Report error to SessionDO
      await this.reportEvent({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        details: error,
      })

      throw error
    }
  }

  /**
   * Report a single event to SessionDO
   *
   * @param event - StreamEvent to report
   */
  private async reportEvent(event: StreamEvent): Promise<void> {
    const url = `${this.sessionUrl}/event`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    })
  }

  /**
   * Fetch with exponential backoff retry
   *
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options)

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          )
        }

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s, ...
          const delay = this.retryDelay * Math.pow(2, attempt)
          console.warn(
            `Request failed (attempt ${attempt + 1}/${this.retryAttempts + 1}), retrying in ${delay}ms:`,
            lastError.message
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(
      `Failed to report event after ${this.retryAttempts + 1} attempts: ${lastError?.message}`
    )
  }
}

/**
 * Create a reporter and stream events from a sandbox process
 *
 * This is a convenience function that combines reporter creation and streaming.
 *
 * @param proc - Sandbox process handle
 * @param config - Reporter configuration
 * @returns Promise that resolves when all events are reported
 */
export async function reportSandboxEvents(
  proc: SandboxProcess,
  config: ReporterConfig
): Promise<void> {
  const reporter = new SandboxReporter(config)
  await reporter.streamToSession(proc)
}
