import type { StreamEvent } from '../types.js'

export interface ReporterOptions {
  sessionId: string
  baseUrl: string
  authToken: string
}

/**
 * Report events to the remote session service
 */
export class EventReporter {
  private eventUrl: string
  private authToken: string

  constructor(options: ReporterOptions) {
    this.eventUrl = `${options.baseUrl}/sessions/${options.sessionId}/event`
    this.authToken = options.authToken
  }

  async send(event: StreamEvent): Promise<void> {
    try {
      await fetch(this.eventUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.error('Failed to send event:', error)
    }
  }

  async sendComplete(code: number): Promise<void> {
    await this.send({
      type: 'complete',
      data: { code },
      timestamp: new Date(),
    })
  }

  async sendError(error: Error): Promise<void> {
    await this.send({
      type: 'error',
      data: { message: error.message, stack: error.stack },
      timestamp: new Date(),
    })
  }
}
